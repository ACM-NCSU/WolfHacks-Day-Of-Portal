"""Schedule endpoints: the day-of agenda, readable by anyone (no login
needed), adjustable by organizers when something runs long or moves.
Persistence is Supabase-backed (see repository.py).

"Current" / "next" are not computed here -- the client compares each
item's start/end time against its own clock, the same way it would for
any other list of timestamps, so the highlight updates every tick
without a request round-trip.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import repository
from auth import get_current_participant

logger = logging.getLogger("wolfhacks")

router = APIRouter(prefix="/api", tags=["schedule"])


def _require_organizer(participant: repository.Participant) -> None:
    if not participant.is_organizer:
        raise HTTPException(status_code=403, detail="Only organizers can adjust the schedule.")


class UpdateScheduleItemRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    location: str | None = Field(default=None, max_length=120)
    start_time: datetime | None = None
    end_time: datetime | None = None


@router.get("/schedule")
def get_schedule():
    return {"schedule": repository.list_schedule()}


@router.patch("/schedule/{item_id}")
def update_schedule_item(
    item_id: str,
    body: UpdateScheduleItemRequest,
    participant: repository.Participant = Depends(get_current_participant),
):
    _require_organizer(participant)
    try:
        return repository.update_schedule_item(
            item_id,
            title=body.title,
            location=body.location,
            start_time=body.start_time,
            end_time=body.end_time,
        )
    except repository.RepositoryError as err:
        raise HTTPException(status_code=400, detail=str(err))
