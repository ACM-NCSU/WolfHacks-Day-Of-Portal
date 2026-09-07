"""Placeholder login for the team dashboard (issue #4), owned by #5 (Bela).

Email only, no password, no Discord OAuth -- just enough to identify "the
current hacker" so #4 isn't blocked on #5 landing first. The token is an
itsdangerous-signed participant id, nothing more.

Swap contract for #5: replace what's in this file (the token format, the
login endpoint, how a participant is looked up) and keep exporting a
get_current_participant dependency with the same shape. Nothing in teams.py
should need to change.
"""

import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from pydantic import BaseModel, Field

import repository

logger = logging.getLogger("wolfhacks")

SESSION_SECRET = os.getenv("WOLFHACKS_SESSION_SECRET", "")
if not SESSION_SECRET:
    logger.warning(
        "WOLFHACKS_SESSION_SECRET is not set -- using an insecure default. "
        "Fine for local dev, never for a deployed environment."
    )
    SESSION_SECRET = "dev-only-insecure-secret"

_serializer = URLSafeTimedSerializer(SESSION_SECRET, salt="wolfhacks-session")
TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7  # a week -- comfortably longer than one event

router = APIRouter(prefix="/api/auth", tags=["auth"])
_bearer_scheme = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)


def _issue_token(participant_id: str) -> str:
    return _serializer.dumps(participant_id)


def get_current_participant(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> repository.Participant:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not logged in.")
    try:
        participant_id = _serializer.loads(credentials.credentials, max_age=TOKEN_MAX_AGE_SECONDS)
    except SignatureExpired:
        raise HTTPException(status_code=401, detail="Your session expired. Please log in again.")
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session.")

    participant = repository.get_participant(participant_id)
    if participant is None:
        raise HTTPException(status_code=401, detail="Invalid session.")
    return participant


@router.post("/login")
def login(request: LoginRequest):
    participant = repository.get_participant_by_email(request.email)
    if participant is None:
        raise HTTPException(status_code=404, detail="This email isn't in our registrant list.")
    if not participant.checked_in:
        raise HTTPException(
            status_code=403,
            detail="You're registered, but not checked in yet. Find an organizer to check in.",
        )
    return {
        "token": _issue_token(participant.id),
        "participant": repository.serialize_participant(participant),
    }


@router.get("/me")
def me(participant: repository.Participant = Depends(get_current_participant)):
    return repository.serialize_participant(participant)
