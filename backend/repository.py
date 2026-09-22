"""Persistence for teams, announcements, schedule, and participant identity.

Team/invite state (this file's largest section) is Supabase Postgres-backed,
per supabase_dev_bootstrap.sql -- teams.py never touches Supabase directly,
it only calls into this module. Announcements and schedule are still
in-memory (state resets on process restart, which matters since this backend
deploys to Vercel as a serverless function); migrating them is a follow-up,
not done here.

Participant identity is NOT mocked: `_participants` starts empty and is
populated by `remember_participant` every time someone authenticates (see
auth.get_current_participant), backed by the real `applications` table in
Supabase via db.py. It exists only to resolve ids to display names for
announcements (`serialize_announcement`'s author_name) -- team/invite reads
hydrate participant data live from Supabase instead of this cache.
"""

import logging
import uuid as uuid_lib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from itertools import count

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


@dataclass
class Announcement:
    id: str
    message: str
    author_id: str
    created_at: datetime


@dataclass
class ScheduleItem:
    id: str
    title: str
    location: str | None
    start_time: datetime
    end_time: datetime


def _seed_schedule() -> list[ScheduleItem]:
    # Anchored to *this process's* start time rather than the real event date
    # so "current" and "next" have something to point at in local dev right
    # now, not just on the actual day.
    now = datetime.now(timezone.utc)

    def at(hours_from_now: float) -> datetime:
        return now + timedelta(hours=hours_from_now)

    return [
        ScheduleItem("s-1", "Opening Ceremony", "Talley Student Union Ballroom", at(-3), at(-2.5)),
        ScheduleItem("s-2", "Team Formation & Icebreakers", None, at(-2.5), at(-1.5)),
        ScheduleItem("s-3", "Workshop: Intro to Git", "Room 3210", at(-1.5), at(-1)),
        ScheduleItem("s-4", "Hacking Block 1", "Main Hacking Hall", at(-1), at(1)),
        ScheduleItem("s-5", "Lunch", "Talley Student Union Ballroom", at(1), at(1.5)),
        ScheduleItem("s-6", "Workshop: Debugging Like a Pro", "Room 3210", at(1.5), at(2.5)),
        ScheduleItem("s-7", "Hacking Block 2", "Main Hacking Hall", at(2.5), at(5)),
        ScheduleItem("s-8", "Judging", "Main Hacking Hall", at(5), at(6)),
        ScheduleItem("s-9", "Closing Ceremony", "Talley Student Union Ballroom", at(6), at(6.5)),
    ]


_participants: list[Participant] = []
_announcements: list[Announcement] = []
_schedule: list[ScheduleItem] = _seed_schedule()

_announcement_id_seq = count(1)


def _find_participant(participant_id: str) -> Participant | None:
    return next((p for p in _participants if p.id == participant_id), None)


def serialize_participant(p: Participant) -> dict:
    return {
        "id": p.id,
        "email": p.email,
        "full_name": p.full_name,
        "checked_in": p.checked_in,
        "is_organizer": p.is_organizer,
    }


# --- Participant identity (backed by the real `applications` table) ---

def remember_participant(p: Participant) -> None:
    """Upsert a participant into the in-memory registry. Called on every
    successful auth.get_current_participant lookup, so anyone who has
    logged in at least once is resolvable by id for announcement display."""
    existing = _find_participant(p.id)
    if existing is not None:
        existing.email = p.email
        existing.full_name = p.full_name
        existing.checked_in = p.checked_in
        existing.is_organizer = p.is_organizer
        existing.role = p.role
    else:
        _participants.append(p)


def get_participant(participant_id: str) -> Participant | None:
    return _find_participant(participant_id)


# --- Supabase client + error translation (teams/invites) ---


def _client() -> Client:
    client = get_supabase_client()
    if client is None:
        raise RepositoryError("Team features are temporarily unavailable.")
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

def serialize_announcement(a: Announcement) -> dict:
    author = _find_participant(a.author_id)
    return {
        "id": a.id,
        "message": a.message,
        "author_name": author.full_name if author else "An organizer",
        "created_at": a.created_at.isoformat(),
    }


def list_announcements(limit: int = 50) -> list[dict]:
    newest_first = sorted(_announcements, key=lambda a: a.created_at, reverse=True)
    return [serialize_announcement(a) for a in newest_first[:limit]]


def create_announcement(author_id: str, message: str) -> dict:
    trimmed = message.strip()
    if not trimmed:
        raise RepositoryError("Announcement message is required.")
    if len(trimmed) > MAX_ANNOUNCEMENT_LENGTH:
        raise RepositoryError(f"Announcement is too long (max {MAX_ANNOUNCEMENT_LENGTH} characters).")
    announcement = Announcement(
        f"an-{next(_announcement_id_seq)}",
        trimmed,
        author_id,
        datetime.now(timezone.utc),
    )
    _announcements.append(announcement)
    return serialize_announcement(announcement)


# --- Schedule ---

def _find_schedule_item(item_id: str) -> ScheduleItem | None:
    return next((i for i in _schedule if i.id == item_id), None)


def serialize_schedule_item(i: ScheduleItem) -> dict:
    return {
        "id": i.id,
        "title": i.title,
        "location": i.location,
        "start_time": i.start_time.isoformat(),
        "end_time": i.end_time.isoformat(),
    }


def list_schedule() -> list[dict]:
    ordered = sorted(_schedule, key=lambda i: i.start_time)
    return [serialize_schedule_item(i) for i in ordered]


def update_schedule_item(
    item_id: str,
    *,
    title: str | None = None,
    location: str | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
) -> dict:
    item = _find_schedule_item(item_id)
    if item is None:
        raise RepositoryError("Schedule item not found.")

    new_start = start_time if start_time is not None else item.start_time
    new_end = end_time if end_time is not None else item.end_time
    if new_end <= new_start:
        raise RepositoryError("End time must be after start time.")

    if title is not None:
        trimmed = title.strip()
        if not trimmed:
            raise RepositoryError("Title is required.")
        item.title = trimmed
    if location is not None:
        item.location = location.strip() or None
    item.start_time = new_start
    item.end_time = new_end
    return serialize_schedule_item(item)
