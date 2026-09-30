"""Persistence for teams, announcements, schedule, and participant identity.

Team/invite state (this file's largest section) is Supabase Postgres-backed,
per supabase_dev_bootstrap.sql -- teams.py never touches Supabase directly,
it only calls into this module. Announcements and the schedule are now
Supabase-backed too (see the `announcements`/`schedule_items` tables in
supabase_schema.sql) -- both used to be plain in-memory Python lists, which
silently lost or "flickered" data on Vercel because a serverless deploy can
route requests to different processes, or cold-start a fresh one, with no
shared memory between them.

Participant identity is NOT mocked: every participant-shaped value here is
either the live `Participant` auth.get_current_participant resolved from the
real `applications` table (via db.py), or hydrated fresh from Supabase per
request (see `_hydrate_participants`) -- there is no participant cache.
"""

import logging
import uuid as uuid_lib
from dataclasses import dataclass
from datetime import datetime, timezone

from postgrest.exceptions import APIError
from supabase import Client

from db import escape_ilike, get_supabase_client

logger = logging.getLogger("wolfhacks")

MAX_TEAM_SIZE = 4
MAX_ANNOUNCEMENT_LENGTH = 500


class RepositoryError(Exception):
    """Raised for any business-rule violation; teams.py/schedule.py/announcements.py map this to an HTTP status."""


@dataclass
class Participant:
    id: str
    email: str
    full_name: str
    checked_in: bool
    is_organizer: bool = False
    role: str = "hacker"


# --- Supabase client + error translation (teams/invites) ---


def _client() -> Client:
    client = get_supabase_client()
    if client is None:
        raise RepositoryError("This feature is temporarily unavailable.")
    return client


# Unique-index violations (Postgres code 23505) -> the exact message the
# constraint is protecting against. Matched by substring against the
# error's message+details, since PostgREST doesn't expose the index name as
# its own field.
_CONSTRAINT_MESSAGES = {
    "teams_name_key": "That team name is already taken.",
    "team_members_one_team": "You are already on a team.",
    "team_invites_one_pending": "That person already has a pending invite from this team.",
}

# Application-raised errors (Postgres code P0001, from supabase_dev_bootstrap.sql's
# plpgsql functions) -> the exact message, keyed by the raise message text.
_RAISED_MESSAGES = {
    "team_full": "Team is already full (max 4 members).",
    "invite_unavailable": "This invite is no longer available.",
    "team_gone": "That team no longer exists.",
    "team_not_found": "Team not found.",
    "not_on_team": "You are not on this team.",
}


def _translate(err: APIError) -> RepositoryError:
    if err.code == "23505":
        haystack = f"{err.message or ''} {err.details or ''}"
        for constraint, message in _CONSTRAINT_MESSAGES.items():
            if constraint in haystack:
                return RepositoryError(message)
    elif err.code == "P0001":
        key = (err.message or "").strip()
        if key in _RAISED_MESSAGES:
            return RepositoryError(_RAISED_MESSAGES[key])
    logger.exception("Unhandled Supabase error (code=%s): %s", err.code, err.message)
    return RepositoryError("Something went wrong. Please try again.")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_uuid(value: str) -> str | None:
    # Guards against a stale token issued before ids were uuids -- treat it
    # as an invalid session, not a 500.
    try:
        return str(uuid_lib.UUID(value))
    except (ValueError, AttributeError, TypeError):
        return None


def _ilike_pattern(term: str) -> str:
    return f"%{escape_ilike(term)}%"


# --- Internal helpers: hydrating raw rows into the serialized shapes ---


def _hydrate_participants(client: Client, ids: list[str]) -> dict[str, dict]:
    if not ids:
        return {}
    rows = (
        client.table("participant_directory")
        .select("id, email, full_name, checked_in")
        .in_("id", list(set(ids)))
        .execute()
        .data
    )
    return {row["id"]: row for row in rows}


def _effective_leader_id(team_row: dict, member_rows: list[dict]) -> str:
    # Defense in depth: leave_team_tx keeps leader_id consistent, but if it
    # were ever out of sync, fall back to the earliest-joined member rather
    # than pointing "leader" at someone no longer on the team.
    leader_id = team_row["leader_id"]
    if any(m["participant_id"] == leader_id for m in member_rows):
        return leader_id
    return member_rows[0]["participant_id"] if member_rows else leader_id


def _serialize_team_row(team_row: dict, member_rows: list[dict], people: dict[str, dict]) -> dict:
    leader_id = _effective_leader_id(team_row, member_rows)
    members = []
    for m in member_rows:
        person = people.get(m["participant_id"])
        if person is None:
            continue
        members.append(
            {
                "id": person["id"],
                "email": person["email"],
                "full_name": person["full_name"],
                "checked_in": person["checked_in"],
                "is_leader": person["id"] == leader_id,
            }
        )
    return {
        "id": team_row["id"],
        "name": team_row["name"],
        "leader_id": leader_id,
        "track_slug": team_row["track_slug"],
        "challenge_slugs": list(team_row.get("challenge_slugs") or []),
        "members": members,
    }


def _get_team(client: Client, team_id: str) -> dict:
    team_rows = client.table("teams").select("*").eq("id", team_id).execute().data
    if not team_rows:
        raise RepositoryError("Team not found.")
    team_row = team_rows[0]
    member_rows = (
        client.table("team_members")
        .select("participant_id, joined_at")
        .eq("team_id", team_id)
        .order("joined_at")
        .execute()
        .data
    )
    people = _hydrate_participants(client, [m["participant_id"] for m in member_rows])
    return _serialize_team_row(team_row, member_rows, people)


def _serialize_invites(client: Client, rows: list[dict]) -> list[dict]:
    if not rows:
        return []
    team_ids = list({r["team_id"] for r in rows})
    person_ids = list({r["invited_by"] for r in rows} | {r["invited_participant_id"] for r in rows})

    team_rows = client.table("teams").select("id, name").in_("id", team_ids).execute().data
    teams_by_id = {t["id"]: t["name"] for t in team_rows}

    member_rows = client.table("team_members").select("team_id").in_("team_id", team_ids).execute().data
    member_counts: dict[str, int] = {}
    for m in member_rows:
        member_counts[m["team_id"]] = member_counts.get(m["team_id"], 0) + 1

    people = _hydrate_participants(client, person_ids)

    serialized = []
    for r in rows:
        invited_by = people.get(r["invited_by"])
        invited = people.get(r["invited_participant_id"])
        serialized.append(
            {
                "id": r["id"],
                "team_id": r["team_id"],
                "status": r["status"],
                "team_name": teams_by_id.get(r["team_id"], "(deleted team)"),
                "member_count": member_counts.get(r["team_id"], 0),
                "invited_by_name": invited_by["full_name"] if invited_by else "Someone",
                "invited_participant_id": r["invited_participant_id"],
                "invited_participant_name": invited["full_name"] if invited else "Someone",
                "invited_participant_email": invited["email"] if invited else "",
            }
        )
    return serialized


# --- Reads ---


def get_team_role(team_id: str, participant_id: str) -> str | None:
    """'leader' | 'member' | None (not on that team, or no such team).

    A 2-query alternative to fetching the full get_my_state() just to read
    one field -- teams.py's mutating endpoints used to do exactly that
    (6-12 round trips) purely to check leadership.
    """
    if _parse_uuid(team_id) is None:
        # Without this, a garbage id reaches Postgres as invalid uuid input
        # (22P02) and surfaces as an opaque 500 instead of the 404 teams.py
        # already returns for "no such team."
        return None
    client = _client()
    member = (
        client.table("team_members")
        .select("team_id")
        .eq("team_id", team_id)
        .eq("participant_id", participant_id)
        .limit(1)
        .execute()
        .data
    )
    if not member:
        return None
    team = client.table("teams").select("leader_id").eq("id", team_id).limit(1).execute().data
    if not team:
        return None
    return "leader" if team[0]["leader_id"] == participant_id else "member"


def get_my_state(participant_id: str) -> dict:
    client = _client()
    membership = (
        client.table("team_members").select("team_id").eq("participant_id", participant_id).execute().data
    )
    team_id = membership[0]["team_id"] if membership else None
    team = _get_team(client, team_id) if team_id else None

    incoming_rows = (
        client.table("team_invites")
        .select("*")
        .eq("invited_participant_id", participant_id)
        .eq("status", "pending")
        .execute()
        .data
    )
    outgoing_rows = []
    if team_id:
        outgoing_rows = (
            client.table("team_invites")
            .select("*")
            .eq("team_id", team_id)
            .eq("status", "pending")
            .execute()
            .data
        )

    # One batched pass over both directions instead of two separate calls --
    # _serialize_invites already de-dupes its .in_() lookups, and incoming
    # and outgoing invites usually reference overlapping teams/people, so
    # serializing them together saves a round trip whenever both are
    # non-empty. Rows come back in input order, so a single split works.
    serialized = _serialize_invites(client, incoming_rows + outgoing_rows)
    split = len(incoming_rows)
    return {
        "team": team,
        "incoming_invites": serialized[:split],
        "outgoing_invites": serialized[split:],
    }


def search_participants(query: str, exclude_participant_id: str) -> list[dict]:
    q = query.strip()
    if not q:
        return []
    client = _client()
    try:
        rows = (
            client.rpc(
                "search_available_participants",
                {"p_pattern": _ilike_pattern(q), "p_exclude": exclude_participant_id},
            )
            .execute()
            .data
        )
    except APIError as err:
        raise _translate(err) from err
    return [
        {"id": r["id"], "email": r["email"], "full_name": r["full_name"], "checked_in": r["checked_in"]}
        for r in rows
    ]


# --- Team lifecycle ---


def create_team(participant_id: str, name: str) -> dict:
    client = _client()

    existing = (
        client.table("team_members").select("participant_id").eq("participant_id", participant_id).execute().data
    )
    if existing:
        raise RepositoryError("You are already on a team.")

    trimmed = name.strip()
    if not trimmed:
        raise RepositoryError("Team name is required.")

    try:
        result = client.table("teams").insert({"name": trimmed, "leader_id": participant_id}).execute()
    except APIError as err:
        raise _translate(err) from err
    team_row = result.data[0]

    try:
        client.table("team_members").insert(
            {"team_id": team_row["id"], "participant_id": participant_id}
        ).execute()
    except APIError as err:
        # The one place two writes aren't atomic: clean up the orphaned team
        # rather than leaving a team with no members behind.
        client.table("teams").delete().eq("id", team_row["id"]).execute()
        raise _translate(err) from err

    return _get_team(client, team_row["id"])


def update_team(
    team_id: str, *, track_slug: str | None = None, challenge_slugs: list[str] | None = None, name: str | None = None
) -> dict:
    updates: dict = {"updated_at": _now_iso()}
    if name is not None:
        trimmed = name.strip()
        if not trimmed:
            raise RepositoryError("Team name is required.")
        updates["name"] = trimmed
    if track_slug is not None:
        updates["track_slug"] = track_slug or None  # "" clears the track, matching prior behavior
    if challenge_slugs is not None:
        updates["challenge_slugs"] = challenge_slugs

    client = _client()
    try:
        result = client.table("teams").update(updates).eq("id", team_id).execute()
    except APIError as err:
        raise _translate(err) from err
    if not result.data:
        raise RepositoryError("Team not found.")
    return _get_team(client, team_id)


def leave_team(team_id: str, participant_id: str) -> dict:
    client = _client()
    try:
        deleted = client.rpc(
            "leave_team_tx", {"p_team_id": team_id, "p_participant_id": participant_id}
        ).execute().data
    except APIError as err:
        raise _translate(err) from err
    if deleted:
        return {"deleted": True}
    return {"deleted": False, "team": _get_team(client, team_id)}


# --- Invites ---


def invite_participant(team_id: str, participant_id: str, invited_by: str) -> dict:
    client = _client()

    team_rows = client.table("teams").select("id").eq("id", team_id).execute().data
    if not team_rows:
        raise RepositoryError("Team not found.")

    member_count = len(
        client.table("team_members").select("participant_id").eq("team_id", team_id).execute().data
    )
    if member_count >= MAX_TEAM_SIZE:
        raise RepositoryError("Team is already full (max 4 members).")

    already_on_team = (
        client.table("team_members").select("participant_id").eq("participant_id", participant_id).execute().data
    )
    if already_on_team:
        raise RepositoryError("That person is already on a team.")

    try:
        result = (
            client.table("team_invites")
            .insert({"team_id": team_id, "invited_participant_id": participant_id, "invited_by": invited_by})
            .execute()
        )
    except APIError as err:
        raise _translate(err) from err

    return _serialize_invites(client, result.data)[0]


def cancel_invite(team_id: str, invite_id: str) -> None:
    client = _client()
    result = (
        client.table("team_invites")
        .update({"status": "cancelled", "responded_at": _now_iso()})
        .eq("id", invite_id)
        .eq("team_id", team_id)
        .eq("status", "pending")
        .execute()
    )
    if not result.data:
        raise RepositoryError("Invite not found.")


def accept_invite(invite_id: str, participant_id: str) -> dict:
    client = _client()
    try:
        team_id = (
            client.rpc(
                "accept_team_invite", {"p_invite_id": invite_id, "p_participant_id": participant_id}
            )
            .execute()
            .data
        )
    except APIError as err:
        raise _translate(err) from err
    # accept_team_invite already returns the joined team's id -- reuse it
    # instead of making the caller do a separate get_my_state() round trip.
    return _get_team(client, str(team_id))


def decline_invite(invite_id: str, participant_id: str) -> None:
    client = _client()
    result = (
        client.table("team_invites")
        .update({"status": "declined", "responded_at": _now_iso()})
        .eq("id", invite_id)
        .eq("invited_participant_id", participant_id)
        .eq("status", "pending")
        .execute()
    )
    if not result.data:
        raise RepositoryError("This invite is no longer available.")


# --- Announcements ---
#
# Supabase-backed (see the `announcements` table in supabase_schema.sql).
# author_name is stored on the row at creation time rather than joined from
# `applications`/`participant_directory` at read time -- it's a handful of
# bytes duplicated per announcement, but it means a display name survives
# even if the poster's application record is later deleted, and it avoids
# another round trip (or the in-memory _find_participant cache this replaced,
# which had the exact same cross-instance staleness this table fixes) just
# to label who posted.

def serialize_announcement(row: dict) -> dict:
    return {
        "id": row["id"],
        "message": row["message"],
        "author_name": row["author_name"],
        "created_at": row["created_at"],
    }


def list_announcements(limit: int = 50) -> list[dict]:
    client = _client()
    result = (
        client.table("announcements")
        .select("id, message, author_name, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return [serialize_announcement(row) for row in result.data]


def create_announcement(author_id: str, author_name: str, message: str) -> dict:
    trimmed = message.strip()
    if not trimmed:
        raise RepositoryError("Announcement message is required.")
    if len(trimmed) > MAX_ANNOUNCEMENT_LENGTH:
        raise RepositoryError(f"Announcement is too long (max {MAX_ANNOUNCEMENT_LENGTH} characters).")
    client = _client()
    try:
        result = (
            client.table("announcements")
            .insert({"message": trimmed, "author_id": author_id, "author_name": author_name})
            .execute()
        )
    except APIError as err:
        raise _translate(err) from err
    return serialize_announcement(result.data[0])


# --- Schedule ---
#
# Supabase-backed (see the `schedule_items` table in supabase_schema.sql),
# seeded there with the real WolfHacks 2026 agenda -- this module no longer
# owns that data, it just reads/writes the table.

def _parse_timestamptz(value: str) -> datetime:
    # PostgREST returns timestamptz as ISO 8601 with a numeric offset (or
    # trailing "Z", depending on version) -- normalize "Z" first so this
    # doesn't depend on which Python version (3.10 vs 3.11+ changed
    # fromisoformat's "Z" handling) the deploy happens to run.
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _get_schedule_item(client: Client, item_id: str) -> dict:
    result = client.table("schedule_items").select("*").eq("id", item_id).execute()
    if not result.data:
        raise RepositoryError("Schedule item not found.")
    return result.data[0]


def serialize_schedule_item(row: dict) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "location": row["location"],
        "start_time": row["start_time"],
        "end_time": row["end_time"],
    }


def list_schedule() -> list[dict]:
    client = _client()
    result = client.table("schedule_items").select("*").order("start_time").execute()
    return [serialize_schedule_item(row) for row in result.data]


def update_schedule_item(
    item_id: str,
    *,
    title: str | None = None,
    location: str | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
) -> dict:
    client = _client()
    current = _get_schedule_item(client, item_id)

    new_start = start_time if start_time is not None else _parse_timestamptz(current["start_time"])
    new_end = end_time if end_time is not None else _parse_timestamptz(current["end_time"])
    if new_end <= new_start:
        raise RepositoryError("End time must be after start time.")

    updates = {"start_time": new_start.isoformat(), "end_time": new_end.isoformat()}
    if title is not None:
        trimmed = title.strip()
        if not trimmed:
            raise RepositoryError("Title is required.")
        updates["title"] = trimmed
    if location is not None:
        updates["location"] = location.strip() or None

    try:
        result = client.table("schedule_items").update(updates).eq("id", item_id).execute()
    except APIError as err:
        raise _translate(err) from err
    return serialize_schedule_item(result.data[0])
