"""In-memory persistence for the team dashboard (issue #4), Phase 3.

Stands in for Supabase until TD-21 (plan.md), the same way
src/data/mockTeamState.js stands in on the frontend -- same function
surface either way, so teams.py and auth_stub.py never touch persistence
directly and TD-21 only has to rewrite what's in this file.

State lives in module-level variables and resets on process restart.
Seeded with the same six accounts as the frontend mock so manual testing
lines up across the stack -- see plan.md "How to test Phase 2".
"""

from dataclasses import dataclass, field
from itertools import count
from typing import Literal

MAX_TEAM_SIZE = 4


class RepositoryError(Exception):
    """Raised for any business-rule violation; teams.py maps this to an HTTP status."""


@dataclass
class Participant:
    id: str
    email: str
    full_name: str
    checked_in: bool


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


_participants: list[Participant] = [
    Participant("p-sam", "sam@ncsu.edu", "Sam Shah", True),
    Participant("p-alex", "alex@ncsu.edu", "Alex Lee", True),
    Participant("p-taylor", "taylor@ncsu.edu", "Taylor Patel", True),
    Participant("p-jordan", "jordan@ncsu.edu", "Jordan Kim", True),
    Participant("p-morgan", "morgan@ncsu.edu", "Morgan Diaz", True),
    Participant("p-casey", "casey@ncsu.edu", "Casey Nguyen", False),
]

_teams: list[Team] = [
    Team("t-wolfpack", "Wolfpack Coders", "p-jordan", "ai-ml", ["best-design"], ["p-jordan", "p-taylor"]),
]

_invites: list[Invite] = [
    Invite("i-alex-wolfpack", "t-wolfpack", "p-alex", "p-jordan", "pending"),
]

_team_id_seq = count(1)
_invite_id_seq = count(1)


def _find_participant(participant_id: str) -> Participant | None:
    return next((p for p in _participants if p.id == participant_id), None)


def _find_team(team_id: str) -> Team | None:
    return next((t for t in _teams if t.id == team_id), None)


def _team_for_participant(participant_id: str) -> Team | None:
    return next((t for t in _teams if participant_id in t.member_ids), None)


def serialize_participant(p: Participant) -> dict:
    return {"id": p.id, "email": p.email, "full_name": p.full_name, "checked_in": p.checked_in}


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


# --- Auth ---

def get_participant_by_email(email: str) -> Participant | None:
    normalized = email.strip().lower()
    return next((p for p in _participants if p.email.lower() == normalized), None)


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
    q = query.strip().lower()
    if not q:
        return []
    results = [
        p for p in _participants
        if p.checked_in and p.id != exclude_participant_id and _team_for_participant(p.id) is None
        and (q in p.full_name.lower() or q in p.email.lower())
    ]
    return [serialize_participant(p) for p in results[:5]]


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
