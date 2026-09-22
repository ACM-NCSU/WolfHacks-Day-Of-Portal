"""Meal check-in: staff scan a hacker's portal QR code (which just encodes
their applications row id) and look up the dietary info collected at
registration. Organizer-only, same trust model as the day-of check-in tool
in main.py.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_participant
from db import get_supabase_client, SUPABASE_APPLICATIONS_TABLE
from repository import Participant

router = APIRouter(prefix="/api/meals", tags=["meals"])

DIETARY_LOOKUP_FIELDS = "id, first_name, last_name, dietary_notes, dietary_notes_other"


class DietaryInfo(BaseModel):
    id: str
    first_name: str
    last_name: str
    dietary_notes: str
    dietary_notes_other: str


def require_organizer(participant: Participant = Depends(get_current_participant)) -> Participant:
    if not participant.is_organizer:
        raise HTTPException(status_code=403, detail="Only organizers can look up meal info.")
    return participant


@router.get("/lookup/{participant_id}", response_model=DietaryInfo)
def lookup_dietary_info(participant_id: str, _: Participant = Depends(require_organizer)):
    client = get_supabase_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Supabase is not configured.")

    result = (
        client.table(SUPABASE_APPLICATIONS_TABLE)
        .select(DIETARY_LOOKUP_FIELDS)
        .eq("id", participant_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No registrant found for that QR code.")

    return result.data[0]
