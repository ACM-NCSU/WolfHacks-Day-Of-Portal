import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from db import get_supabase_client, SUPABASE_APPLICATIONS_TABLE
from repository import Participant, remember_participant

logger = logging.getLogger("wolfhacks")

router = APIRouter(prefix="/api/auth", tags=["auth"])

APPLICATION_AUTH_FIELDS = "id, email, first_name, last_name, user_id, discord_id, discord_username, role, checked_in"


class PasswordSetupRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def get_authenticated_user(authorization: str | None):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required."
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header."
        )

    token = authorization[len("Bearer "):]
    supabase = get_supabase_client()

    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase is not configured."
        )

    try:
        response = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session."
        )

    if response.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session."
        )

    return response.user


def get_and_backfill_user(
    auth_user_id: str,
    email: str | None = None,
    discord_id: str | None = None,
    discord_username: str | None = None
) -> dict | None:
    """
    Finds an application record by auth_user_id, discord_id, email, or discord_username.
    Automatically links auth_user_id and backfills discord_id upon successful identification.
    """
    client = get_supabase_client()
    if not client:
        return None

    table = client.table(SUPABASE_APPLICATIONS_TABLE)

    # Match by previously linked user_id
    res = table.select(APPLICATION_AUTH_FIELDS).eq("user_id", auth_user_id).execute()
    if res.data:
        return res.data[0]

    # Match by previously filled Discord ID
    if discord_id:
        res = table.select(APPLICATION_AUTH_FIELDS).eq("discord_id", discord_id).execute()
        if res.data:
            matched = res.data[0]
            # Link auth_user_id if not linked yet
            if not matched.get("user_id"):
                try:
                    table.update({"user_id": auth_user_id}).eq("id", matched["id"]).execute()
                    matched["user_id"] = auth_user_id
                except Exception:
                    logger.exception("Failed linking user_id to app ID %s", matched["id"])
            return matched

    # Match by Email or Discord Username
    # ilike (no wildcards) does a case-insensitive exact match -- applications.email
    # isn't normalized to lowercase at submission time, so a plain .eq here would
    # miss anyone who applied with a mixed-case email.
    conditions = []
    if email:
        conditions.append(f"email.ilike.{email}")
    if discord_username:
        conditions.append(f"discord_username.eq.{discord_username}")

    if not conditions:
        return None

    res = table.select(APPLICATION_AUTH_FIELDS).or_(",".join(conditions)).execute()
    if not res.data:
        return None

    matched = res.data[0]
    updates = {}

    # Link user_id if missing
    if not matched.get("user_id"):
        updates["user_id"] = auth_user_id
        matched["user_id"] = auth_user_id

    # Backfill discord_id if missing and logging in via Discord
    if discord_id and not matched.get("discord_id"):
        updates["discord_id"] = discord_id
        matched["discord_id"] = discord_id

    if updates:
        try:
            table.update(updates).eq("id", matched["id"]).execute()
            logger.info("Updated application ID %s with: %s", matched["id"], updates)
        except Exception:
            logger.exception("Failed to update backfill values for app ID %s", matched["id"])

    return matched


def check_user_registration(email: str | None = None, discord_username: str | None = None) -> bool:
    """Verify an applicant exists prior to sending password setup links."""
    client = get_supabase_client()
    if not client:
        return False

    query = client.table(SUPABASE_APPLICATIONS_TABLE).select("id")
    if email and discord_username:
        response = query.or_(f"email.ilike.{email},discord_username.eq.{discord_username}").execute()
    elif email:
        response = query.ilike("email", email).execute()
    elif discord_username:
        response = query.eq("discord_username", discord_username).execute()
    else:
        return False

    return len(response.data) > 0


def get_current_participant(authorization: str | None = Header(default=None)) -> Participant:
    """
    The one auth dependency every router (teams, schedule, announcements) depends
    on. Validates the Supabase bearer token, resolves it to an applications row,
    and enforces the day-of check-in gate: hackers must be checked in to use the
    portal, but organizers/admins are exempt since staff need access before
    anyone's been checked in.
    """
    user = get_authenticated_user(authorization)
    user_metadata = user.user_metadata or {}

    provider = user.app_metadata.get("provider")
    discord_id = user_metadata.get("sub") if provider == "discord" else None
    # Supabase's Discord provider does not populate "preferred_username" --
    # the plain username (no discriminator) comes through as "full_name". The
    # applications table stores discord_username with a leading "@" (the
    # application form requires it), so prefix it here to match.
    discord_username = f"@{user_metadata['full_name']}" if provider == "discord" and user_metadata.get("full_name") else None

    app_record = get_and_backfill_user(
        auth_user_id=user.id,
        email=user.email,
        discord_id=discord_id,
        discord_username=discord_username,
    )

    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not found in registration database. You must apply first."
        )

    role = app_record.get("role", "hacker")
    is_organizer = role in ("organizer", "admin")
    checked_in = bool(app_record.get("checked_in"))

    if not is_organizer and not checked_in:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must check in at the event before accessing the portal."
        )

    full_name = f"{app_record.get('first_name') or ''} {app_record.get('last_name') or ''}".strip()

    participant = Participant(
        id=app_record["id"],
        email=app_record.get("email", user.email),
        full_name=full_name or app_record.get("email", user.email),
        checked_in=checked_in,
        is_organizer=is_organizer,
        role=role,
    )
    remember_participant(participant)
    return participant


@router.get("/me")
def auth_me(participant: Participant = Depends(get_current_participant)):
    return {
        "authenticated": True,
        "user_id": participant.id,
        "email": participant.email,
        "full_name": participant.full_name,
        "role": participant.role,
        "checked_in": participant.checked_in,
        "registered": True,
    }


@router.post("/request-password-setup")
def request_password_setup(payload: PasswordSetupRequest):
    # Enforce that they exist in the applications database first
    if not check_user_registration(email=payload.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This email is not registered for WolfHacks. Please use the email you applied with."
        )

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase is not configured."
        )

    try:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        response = supabase.auth.admin.generate_link({
            "type": "recovery",
            "email": payload.email,
            "options": {
                "redirect_to": f"{frontend_url}/portal/setup-request"
            }
        })

        # In production, dispatch action_link via email service (e.g. Resend)
        action_link = getattr(response.properties, "action_link", None) if hasattr(response, "properties") else None

        return {
            "message": "Password setup instructions generated.",
            "debug_link": action_link if os.getenv("DEBUG") else None
        }
    except Exception as exc:
        logger.exception("Failed generating password setup link for %s", payload.email)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/verify-and-grant-access")
def verify_and_grant_access(payload: PasswordSetupRequest):
    email = payload.email.strip().lower()

    # Enforce registration check in applications table
    if not check_user_registration(email=email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This email is not registered for WolfHacks. Please use the email you applied with."
        )

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase client not configured."
        )

    try:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

        # Generate setup/recovery link without sending an email
        link_response = supabase.auth.admin.generate_link({
            "type": "recovery",
            "email": email,
            "options": {
                "redirect_to": f"{frontend_url}/portal/setup-request"
            }
        })

        # Extract action link generated by Supabase
        action_link = link_response.properties.action_link

        return {
            "success": True,
            "action_link": action_link
        }

    except Exception as exc:
        logger.exception("Failed granting access link for %s", email)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
