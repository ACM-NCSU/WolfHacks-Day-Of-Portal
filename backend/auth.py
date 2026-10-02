import logging

from fastapi import APIRouter, Depends, Header, HTTPException, status

from db import get_supabase_client, SUPABASE_APPLICATIONS_TABLE
from repository import Participant

logger = logging.getLogger("wolfhacks")

router = APIRouter(prefix="/api/auth", tags=["auth"])

APPLICATION_AUTH_FIELDS = "id, email, first_name, last_name, user_id, discord_id, discord_username, role, checked_in"


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
        # usePortalSession.js keys off "check in" in this detail to show the
        # "head to the check-in desk" message instead of "not registered".
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
