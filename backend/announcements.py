"""Announcement endpoints: organizers broadcast quick updates to the portal.

Posting also forwards the announcement to a Discord channel via an
incoming webhook (WOLFHACKS_DISCORD_WEBHOOK_URL) when one is configured --
same "skip entirely if unset, no request ever made" shape as main.py's
Axiom handler. Persistence is Supabase-backed (see repository.py).
"""

import json
import logging
import os
import urllib.error
import urllib.request

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import repository
from auth import get_current_participant

logger = logging.getLogger("wolfhacks")

router = APIRouter(prefix="/api", tags=["announcements"])

DISCORD_WEBHOOK_URL = os.getenv("WOLFHACKS_DISCORD_WEBHOOK_URL", "")


def _require_organizer(participant: repository.Participant) -> None:
    if not participant.is_organizer:
        raise HTTPException(status_code=403, detail="Only organizers can post announcements.")


def _notify_discord(announcement: dict) -> None:
    if not DISCORD_WEBHOOK_URL:
        logger.info("Skipping Discord notification: WOLFHACKS_DISCORD_WEBHOOK_URL not configured")
        return

    payload = {
        "content": f"\U0001F4E3 **{announcement['author_name']}**: {announcement['message']}",
        # message is organizer-authored free text forwarded verbatim -- without
        # this, an announcement that happens to contain "@everyone", "@here",
        # or a role mention would actually ping the whole server when relayed.
        "allowed_mentions": {"parse": []},
    }
    request = urllib.request.Request(
        DISCORD_WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            # Discord's Cloudflare front rejects urllib's default
            # "Python-urllib/x.y" User-Agent with 403 "error code: 1010", so
            # every relay failed until this was set explicitly.
            "User-Agent": "WolfHacksPortal (https://github.com/ACM-NCSU/WolfHacks-Day-Of-Portal, 1.0)",
        },
        method="POST",
    )
    try:
        urllib.request.urlopen(request, timeout=5)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace") if hasattr(exc, "read") else ""
        logger.error("Discord webhook rejected the announcement: HTTP %s %s: %s", exc.code, exc.reason, body)
    except Exception:
        # Discord being unreachable must never fail the announcement itself --
        # it's already broadcast on the portal by the time this runs.
        logger.exception("Failed to deliver announcement to Discord webhook")


class CreateAnnouncementRequest(BaseModel):
    message: str = Field(min_length=1, max_length=repository.MAX_ANNOUNCEMENT_LENGTH)


@router.get("/announcements")
def get_announcements():
    return {"announcements": repository.list_announcements()}


@router.post("/announcements", status_code=201)
def create_announcement(
    body: CreateAnnouncementRequest,
    participant: repository.Participant = Depends(get_current_participant),
):
    _require_organizer(participant)
    try:
        announcement = repository.create_announcement(participant.id, participant.full_name, body.message)
    except repository.RepositoryError as err:
        raise HTTPException(status_code=400, detail=str(err))
    _notify_discord(announcement)
    return announcement
