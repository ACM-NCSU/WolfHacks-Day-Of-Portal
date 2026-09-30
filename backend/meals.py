"""Meal check-in: staff scan a hacker's portal QR code (which just encodes
their applications row id), pick which of the 4 scheduled meals they're
handing out, and the scan both looks up dietary info and marks that meal
consumed in one step. A meal can only be marked once -- scanning the same
person for the same meal again is rejected as already-scanned rather than
silently re-marking it. Organizer-only, same trust model as the day-of
check-in tool in main.py.
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_participant
from db import get_supabase_client, SUPABASE_APPLICATIONS_TABLE
from repository import Participant

router = APIRouter(prefix="/api/meals", tags=["meals"])

# Slug -> (db column, display label). Matches the 4 real meals on the event
# schedule (repository.py's _seed_schedule): Day 1 lunch/dinner, Day 2
# breakfast/lunch.
MEAL_SLOTS: dict[str, tuple[str, str]] = {
    "lunch_day1": ("meal_lunch_day1", "Day 1 Lunch"),
    "dinner_day1": ("meal_dinner_day1", "Day 1 Dinner"),
    "breakfast_day2": ("meal_breakfast_day2", "Day 2 Breakfast"),
    "lunch_day2": ("meal_lunch_day2", "Day 2 Lunch"),
}
MealSlot = Literal["lunch_day1", "dinner_day1", "breakfast_day2", "lunch_day2"]

SCAN_FIELDS = "id, first_name, last_name, dietary_notes, dietary_notes_other"


class MealSlotInfo(BaseModel):
    slug: str
    label: str


class ScanMealRequest(BaseModel):
    participant_id: str
    meal_slot: MealSlot


class MealScanResult(BaseModel):
    id: str
    first_name: str
    last_name: str
    dietary_notes: str
    dietary_notes_other: str


def require_organizer(participant: Participant = Depends(get_current_participant)) -> Participant:
    if not participant.is_organizer:
        raise HTTPException(status_code=403, detail="Only organizers can scan meal check-ins.")
    return participant


@router.get("/slots", response_model=list[MealSlotInfo])
def list_meal_slots(_: Participant = Depends(require_organizer)):
    return [{"slug": slug, "label": label} for slug, (_column, label) in MEAL_SLOTS.items()]


@router.post("/scan", response_model=MealScanResult)
def scan_meal(body: ScanMealRequest, _: Participant = Depends(require_organizer)):
    client = get_supabase_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Supabase is not configured.")

    column, label = MEAL_SLOTS[body.meal_slot]
    table = client.table(SUPABASE_APPLICATIONS_TABLE)

    result = (
        table.select(f"{SCAN_FIELDS}, {column}")
        .eq("id", body.participant_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No registrant found for that QR code.")

    row = result.data[0]
    full_name = f"{row['first_name']} {row['last_name']}".strip()

    if row.get(column):
        raise HTTPException(
            status_code=409,
            detail=f"This QR code has already been scanned for {label} ({full_name}).",
        )

    updated = (
        table.update({column: True})
        .eq("id", body.participant_id)
        .eq(column, False)  # last-write-wins guard against two organizers scanning at once
        .execute()
    )
    if not updated.data:
        raise HTTPException(
            status_code=409,
            detail=f"This QR code has already been scanned for {label} ({full_name}).",
        )

    return {k: updated.data[0][k] for k in ("id", "first_name", "last_name", "dietary_notes", "dietary_notes_other")}
