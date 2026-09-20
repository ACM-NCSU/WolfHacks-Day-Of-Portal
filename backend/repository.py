"""In-memory persistence for the team dashboard, schedule, and announcements.

Stands in for real Supabase tables (teams/invites/schedule_items/
announcements) pending a follow-up migration -- teams.py, schedule.py, and
announcements.py never touch persistence directly, so that migration only
has to rewrite what's in this file.

State lives in module-level variables and resets on process restart --
acceptable for now, but note this backend deploys to Vercel as a serverless
function, where in-memory state is not guaranteed to survive between
invocations. Real persistence is a known follow-up, not done here.

Participant identity, unlike team/schedule/announcement state, is NOT
mocked: `_participants` starts empty and is populated by `remember_participant`
every time someone authenticates (see auth.get_current_participant) or gets
invited to a team (see `_ensure_participant_known`), backed by the real
`applications` table in Supabase via db.py.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from itertools import count
from typing import Literal

from db import get_supabase_client, escape_ilike, SUPABASE_APPLICATIONS_TABLE

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
class Team:
    id: str
    name: str
    leader_id: str
    track_slug: str | None
    challenge_slugs: list[str]
    member_ids: list[str]  # insertion order == join order


@dataclass
class Invite:
    id: str
    team_id: str
    invited_participant_id: str
    invited_by: str
    status: Literal["pending", "accepted", "declined", "cancelled"]


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
_teams: list[Team] = []
_invites: list[Invite] = []
_announcements: list[Announcement] = []
_schedule: list[ScheduleItem] = _seed_schedule()

_team_id_seq = count(1)
_invite_id_seq = count(1)
_announcement_id_seq = count(1)


def _find_participant(participant_id: str) -> Participant | None:
    return next((p for p in _participants if p.id == participant_id), None)


def _find_team(team_id: str) -> Team | None:
    return next((t for t in _teams if t.id == team_id), None)


def _team_for_participant(participant_id: str) -> Team | None:
    return next((t for t in _teams if participant_id in t.member_ids), None)


def serialize_participant(p: Participant) -> dict:
    return {
        "id": p.id,
        "email": p.email,
        "full_name": p.full_name,
        "checked_in": p.checked_in,
        "is_organizer": p.is_organizer,
    }


def serialize_team(t: Team, leader_id: str | None = None) -> dict:
    leader = leader_id or t.leader_id
    members = [
        {**serialize_participant(p), "is_leader": p.id == leader}
        for p in (_find_participant(pid) for pid in t.member_ids)
        if p is not None
    ]
    return {
        "id": t.id,
        "name": t.name,
        "leader_id": leader,
        "track_slug": t.track_slug,
        "challenge_slugs": list(t.challenge_slugs),
        "members": members,
    }


def serialize_invite(i: Invite) -> dict:
    team = _find_team(i.team_id)
    invited_by = _find_participant(i.invited_by)
    invited = _find_participant(i.invited_participant_id)
    return {
        "id": i.id,
        "team_id": i.team_id,
        "status": i.status,
        "team_name": team.name if team else "(deleted team)",
        "member_count": len(team.member_ids) if team else 0,
        "invited_by_name": invited_by.full_name if invited_by else "Someone",
        "invited_participant_id": i.invited_participant_id,
        "invited_participant_name": invited.full_name if invited else "Someone",
        "invited_participant_email": invited.email if invited else "",
    }


# --- Participant identity (backed by the real `applications` table) ---

def remember_participant(p: Participant) -> None:
    """Upsert a participant into the in-memory registry. Called on every
    successful auth.get_current_participant lookup, so anyone who has
    logged in at least once is resolvable by id for team/invite display."""
    existing = _find_participant(p.id)
    if existing is not None:
        existing.email = p.email
        existing.full_name = p.full_name
        existing.checked_in = p.checked_in
        existing.is_organizer = p.is_organizer
        existing.role = p.role
    else:
        _participants.append(p)


def _row_to_participant(row: dict) -> Participant:
    full_name = f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or row["email"]
    role = row.get("role", "hacker")
    return Participant(
        id=row["id"],
        email=row["email"],
        full_name=full_name,
        checked_in=bool(row.get("checked_in")),
        is_organizer=role in ("organizer", "admin"),
        role=role,
    )


def _ensure_participant_known(participant_id: str) -> None:
    """Backfill a participant who hasn't logged in yet but was just found via
    search_participants (e.g. the person being invited to a team)."""
    if _find_participant(participant_id) is not None:
        return
    client = get_supabase_client()
    if client is None:
        return
    res = (
        client.table(SUPABASE_APPLICATIONS_TABLE)
        .select("id, email, first_name, last_name, checked_in, role")
        .eq("id", participant_id)
        .limit(1)
        .execute()
    )
    if res.data:
        remember_participant(_row_to_participant(res.data[0]))


def get_participant(participant_id: str) -> Participant | None:
    return _find_participant(participant_id)


# --- Reads ---

def get_my_state(participant_id: str) -> dict:
    team = _team_for_participant(participant_id)
    incoming = [serialize_invite(i) for i in _invites if i.invited_participant_id == participant_id and i.status == "pending"]
    outgoing = [serialize_invite(i) for i in _invites if team and i.team_id == team.id and i.status == "pending"]
    return {
        "team": serialize_team(team) if team else None,
        "incoming_invites": incoming,
        "outgoing_invites": outgoing,
    }


def search_participants(query: str, exclude_participant_id: str) -> list[dict]:
    """Searches real checked-in applicants (not the in-memory registry --
    someone can be searched/invited before they've ever logged in), filtered
    to people not already on a team."""
    q = query.strip()
    if not q:
        return []
    client = get_supabase_client()
    if client is None:
        return []

    table = client.table(SUPABASE_APPLICATIONS_TABLE)
    fields = "id, email, first_name, last_name, checked_in, role"
    pattern = f"%{escape_ilike(q)}%"

    candidates: dict[str, dict] = {}
    for column in ("first_name", "last_name", "email"):
        rows = (
            table.select(fields)
            .eq("checked_in", True)
            .ilike(column, pattern)
            .limit(20)
            .execute()
            .data
        )
        for row in rows:
            candidates[row["id"]] = row

    results = []
    for row in candidates.values():
        if row["id"] == exclude_participant_id:
            continue
        if _team_for_participant(row["id"]) is not None:
            continue
        results.append(serialize_participant(_row_to_participant(row)))
        if len(results) >= 5:
            break
    return results


# --- Team lifecycle ---

def create_team(participant_id: str, name: str) -> dict:
    if _team_for_participant(participant_id) is not None:
        raise RepositoryError("You are already on a team.")
    trimmed = name.strip()
    if not trimmed:
        raise RepositoryError("Team name is required.")
    if any(t.name.lower() == trimmed.lower() for t in _teams):
        raise RepositoryError("That team name is already taken.")
    team = Team(f"t-{next(_team_id_seq)}", trimmed, participant_id, None, [], [participant_id])
    _teams.append(team)
    return serialize_team(team)


def update_team(team_id: str, *, track_slug: str | None = None, challenge_slugs: list[str] | None = None, name: str | None = None) -> dict:
    team = _find_team(team_id)
    if team is None:
        raise RepositoryError("Team not found.")
    if name is not None:
        trimmed = name.strip()
        if not trimmed:
            raise RepositoryError("Team name is required.")
        if any(t.name.lower() == trimmed.lower() and t.id != team_id for t in _teams):
            raise RepositoryError("That team name is already taken.")
        team.name = trimmed
    if track_slug is not None:
        team.track_slug = track_slug or None
    if challenge_slugs is not None:
        team.challenge_slugs = challenge_slugs
    return serialize_team(team)


def leave_team(team_id: str, participant_id: str) -> dict:
    team = _find_team(team_id)
    if team is None:
        raise RepositoryError("Team not found.")
    if participant_id not in team.member_ids:
        raise RepositoryError("You are not on this team.")
    team.member_ids.remove(participant_id)

    if not team.member_ids:
        _teams.remove(team)
        for invite in [i for i in _invites if i.team_id == team_id]:
            _invites.remove(invite)
        return {"deleted": True}

    if team.leader_id == participant_id:
        team.leader_id = team.member_ids[0]  # earliest-joined remaining member
    return {"deleted": False, "team": serialize_team(team)}


# --- Invites ---

def invite_participant(team_id: str, participant_id: str, invited_by: str) -> dict:
    team = _find_team(team_id)
    if team is None:
        raise RepositoryError("Team not found.")
    if len(team.member_ids) >= MAX_TEAM_SIZE:
        raise RepositoryError("Team is already full (max 4 members).")
    if _team_for_participant(participant_id) is not None:
        raise RepositoryError("That person is already on a team.")
    if any(i.team_id == team_id and i.invited_participant_id == participant_id and i.status == "pending" for i in _invites):
        raise RepositoryError("That person already has a pending invite from this team.")
    _ensure_participant_known(participant_id)
    invite = Invite(f"i-{next(_invite_id_seq)}", team_id, participant_id, invited_by, "pending")
    _invites.append(invite)
    return serialize_invite(invite)


def _find_pending_invite(invite_id: str) -> Invite | None:
    return next((i for i in _invites if i.id == invite_id and i.status == "pending"), None)


def cancel_invite(invite_id: str) -> None:
    invite = next((i for i in _invites if i.id == invite_id), None)
    if invite is None:
        raise RepositoryError("Invite not found.")
    invite.status = "cancelled"


def accept_invite(invite_id: str, participant_id: str) -> None:
    invite = _find_pending_invite(invite_id)
    if invite is None or invite.invited_participant_id != participant_id:
        raise RepositoryError("This invite is no longer available.")
    if _team_for_participant(participant_id) is not None:
        raise RepositoryError("You are already on a team.")
    team = _find_team(invite.team_id)
    if team is None:
        raise RepositoryError("That team no longer exists.")
    if len(team.member_ids) >= MAX_TEAM_SIZE:
        raise RepositoryError("Team is already full (max 4 members).")

    invite.status = "accepted"
    team.member_ids.append(participant_id)

    for other in _invites:
        if other.invited_participant_id == participant_id and other.status == "pending" and other.id != invite_id:
            other.status = "cancelled"


def decline_invite(invite_id: str, participant_id: str) -> None:
    invite = _find_pending_invite(invite_id)
    if invite is None or invite.invited_participant_id != participant_id:
        raise RepositoryError("This invite is no longer available.")
    invite.status = "declined"


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
