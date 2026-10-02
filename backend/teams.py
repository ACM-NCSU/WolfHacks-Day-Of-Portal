"""Team dashboard endpoints (issue #4).

Persistence goes through repository.py, which is Supabase-backed for
teams/invites -- these routes don't know or care.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

import repository
from auth import get_current_participant

logger = logging.getLogger("wolfhacks")

router = APIRouter(prefix="/api", tags=["teams"])

# Must mirror the slugs in src/data/siteConfig.js `event.tracks` /
# `event.challenges` exactly -- the team picker sends those slugs, and any
# slug missing here is rejected with a 422. Update both places together.
TRACK_SLUGS = {
    "geospatial-analytics",
    "applied-ai-software",
    "applied-ai-hardware",
    "applied-ai-challenge",
    "advanced-analytics",
}
CHALLENGE_SLUGS = {"best-design", "best-sponsor-api", "best-first-hack"}


def _raise_for(err: repository.RepositoryError, status_code: int = 400):
    raise HTTPException(status_code=status_code, detail=str(err))


def _require_leader_of(team_id: str, participant: repository.Participant) -> None:
    # A 2-query leadership check instead of fetching the full get_my_state()
    # (6-12 round trips) just to read one field.
    role = repository.get_team_role(team_id, participant.id)
    if role is None:
        raise HTTPException(status_code=404, detail="Team not found.")
    if role != "leader":
        raise HTTPException(status_code=403, detail="Only the team leader can do that.")


def _notify_invite(invite: dict) -> None:
    # No Discord bot or email provider configured for team invites -- a
    # webhook can only post to a channel, not DM a person. In-app only for
    # v1.
    logger.info(
        "Team invite sent: %s invited to team %s",
        invite["invited_participant_email"],
        invite["team_name"],
    )


class CreateTeamRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class UpdateTeamRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    track_slug: str | None = None
    challenge_slugs: list[str] | None = None

    @field_validator("track_slug")
    @classmethod
    def validate_track(cls, value):
        if value is not None and value not in TRACK_SLUGS:
            raise ValueError(f"Unknown track: {value}")
        return value

    @field_validator("challenge_slugs")
    @classmethod
    def validate_challenges(cls, value):
        if value is not None:
            unknown = set(value) - CHALLENGE_SLUGS
            if unknown:
                raise ValueError(f"Unknown challenge(s): {', '.join(sorted(unknown))}")
        return value


class InviteRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)


# --- Reads ---

@router.get("/team/me")
def get_my_team(participant: repository.Participant = Depends(get_current_participant)):
    state = repository.get_my_state(participant.id)
    return {
        "team": state["team"],
        "incoming_invites": state["incoming_invites"],
        "outgoing_invites": state["outgoing_invites"],
    }


# --- Team lifecycle ---

@router.post("/teams", status_code=201)
def create_team(body: CreateTeamRequest, participant: repository.Participant = Depends(get_current_participant)):
    try:
        return repository.create_team(participant.id, body.name)
    except repository.RepositoryError as err:
        _raise_for(err)


@router.patch("/teams/{team_id}")
def update_team(team_id: str, body: UpdateTeamRequest, participant: repository.Participant = Depends(get_current_participant)):
    _require_leader_of(team_id, participant)
    try:
        return repository.update_team(
            team_id,
            name=body.name,
            track_slug=body.track_slug,
            challenge_slugs=body.challenge_slugs,
        )
    except repository.RepositoryError as err:
        _raise_for(err)


@router.delete("/teams/{team_id}/members/me")
def leave_team(team_id: str, participant: repository.Participant = Depends(get_current_participant)):
    try:
        return repository.leave_team(team_id, participant.id)
    except repository.RepositoryError as err:
        _raise_for(err, status_code=404)


# --- Invites ---

@router.post("/teams/{team_id}/invites", status_code=201)
def create_invite(team_id: str, body: InviteRequest, participant: repository.Participant = Depends(get_current_participant)):
    _require_leader_of(team_id, participant)
    try:
        invitee_id = repository.find_invitee_by_email(body.email, participant.id)
    except repository.RepositoryError as err:
        _raise_for(err, status_code=404)
    try:
        invite = repository.invite_participant(team_id, invitee_id, participant.id)
    except repository.RepositoryError as err:
        _raise_for(err, status_code=409)
    _notify_invite(invite)
    return invite


@router.delete("/teams/{team_id}/invites/{invite_id}", status_code=204)
def cancel_invite(team_id: str, invite_id: str, participant: repository.Participant = Depends(get_current_participant)):
    _require_leader_of(team_id, participant)
    try:
        repository.cancel_invite(team_id, invite_id)
    except repository.RepositoryError as err:
        _raise_for(err, status_code=404)


@router.post("/invites/{invite_id}/accept")
def accept_invite(invite_id: str, participant: repository.Participant = Depends(get_current_participant)):
    try:
        return repository.accept_invite(invite_id, participant.id)
    except repository.RepositoryError as err:
        _raise_for(err, status_code=409)


@router.post("/invites/{invite_id}/decline", status_code=204)
def decline_invite(invite_id: str, participant: repository.Participant = Depends(get_current_participant)):
    try:
        repository.decline_invite(invite_id, participant.id)
    except repository.RepositoryError as err:
        _raise_for(err, status_code=404)
