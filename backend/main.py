import json
import logging
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, status, Request as FastAPIRequest
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from supabase import create_client

load_dotenv()

_log_formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")

# Vercel's log viewer buckets by stream (stdout -> Info, stderr -> Error), not by
# Python log level, so INFO/DEBUG go to stdout and WARNING+ go to stderr to keep
# routine "accepted submission" logs from showing up as errors in the dashboard.
_stdout_handler = logging.StreamHandler(sys.stdout)
_stdout_handler.setFormatter(_log_formatter)
_stdout_handler.addFilter(lambda record: record.levelno < logging.WARNING)

_stderr_handler = logging.StreamHandler(sys.stderr)
_stderr_handler.setFormatter(_log_formatter)
_stderr_handler.setLevel(logging.WARNING)

_handlers = [_stdout_handler, _stderr_handler]

# Optional: ship the same log records to Axiom over its HTTP ingest API, so
# they outlive Vercel's short log retention. Skipped entirely (no request
# ever made) unless both env vars are set. Uses urllib instead of an extra
# dependency since this is one small POST per log line.
AXIOM_TOKEN = os.getenv("AXIOM_TOKEN", "")
AXIOM_DATASET = os.getenv("AXIOM_DATASET", "")


class AxiomHandler(logging.Handler):
    def __init__(self, dataset: str, token: str):
        super().__init__()
        self._url = f"https://api.axiom.co/v1/datasets/{dataset}/ingest"
        self._token = token

    def emit(self, record: logging.LogRecord) -> None:
        try:
            event = {
                "_time": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            }
            if record.exc_info:
                event["stacktrace"] = self.formatException(record.exc_info)
            request = urllib.request.Request(
                self._url,
                data=json.dumps([event]).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {self._token}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            urllib.request.urlopen(request, timeout=2)
        except urllib.error.HTTPError as exc:
            # A logging failure must never break the request being handled --
            # but print the reason straight to stderr (bypassing `logger`,
            # which would recurse back into this handler) so it's visible in
            # Vercel's Runtime Logs for debugging Axiom delivery issues.
            body = exc.read().decode("utf-8", errors="replace") if hasattr(exc, "read") else ""
            print(f"[AxiomHandler] delivery failed: HTTP {exc.code} {exc.reason}: {body}", file=sys.stderr)
        except Exception as exc:
            print(f"[AxiomHandler] delivery failed: {type(exc).__name__}: {exc}", file=sys.stderr)


if AXIOM_TOKEN and AXIOM_DATASET:
    _handlers.append(AxiomHandler(AXIOM_DATASET, AXIOM_TOKEN))

logging.basicConfig(
    level=os.getenv("WOLFHACKS_LOG_LEVEL", "INFO"),
    handlers=_handlers,
)
logger = logging.getLogger("wolfhacks")

app = FastAPI(title="WolfHacks API")
UNIVERSITY_LEVELS = {
    "Undergraduate University (2 year - community college or similar)",
    "Undergraduate University (3+ year)",
    "Graduate University (Masters, Professional, Doctoral, etc)",
    "Post Doctorate",
}
GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "service-account.json")
SERVICE_ACCOUNT_JSON = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
SPREADSHEET_ID = os.getenv(
    "GOOGLE_SHEETS_SPREADSHEET_ID",
    "1ckYK82T8wayiCLtluOkQek4gQ4lwwE2WEvyWRLR6I3M",
)
SHEETS_RANGE = os.getenv("GOOGLE_SHEETS_RANGE", "Applications!A:X")

# Supabase connection fields. Writes go through the service role key so they
# bypass RLS from the backend the same way the Sheets append bypasses sharing
# permissions via the service account.
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_APPLICATIONS_TABLE = os.getenv("SUPABASE_APPLICATIONS_TABLE", "applications")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "WOLFHACKS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: FastAPIRequest, exc: RequestValidationError):
    body = exc.body if isinstance(exc.body, dict) else {}
    errors = jsonable_encoder(exc.errors())
    logger.warning(
        "Rejected application submission (validation failed) from %s %s <%s>: %s",
        body.get("first_name", "?"),
        body.get("last_name", "?"),
        body.get("email", "?"),
        errors,
    )
    return JSONResponse(status_code=422, content={"detail": errors})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: FastAPIRequest, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


class Application(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    middle_name: str = Field(default="", max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    age: int = Field(ge=18, le=99)
    email: str = Field(min_length=5, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    country_of_residence: str = Field(min_length=2, max_length=100)
    discord_username: str = Field(min_length=3, max_length=33, pattern=r"^@[a-z0-9_.]{2,32}$")
    phone_number: str = Field(
        min_length=14,
        max_length=14,
        pattern=r"^\([2-9]\d{2}\) [2-9]\d{2}-\d{4}$",
    )
    linkedin_url: str = Field(default="", max_length=200, pattern=r"^$|^https?://\S+\.\S+$")
    classification: Literal[
        "Less than Secondary / High School",
        "Secondary / High School",
        "Undergraduate University (2 year - community college or similar)",
        "Undergraduate University (3+ year)",
        "Graduate University (Masters, Professional, Doctoral, etc)",
        "Code School / Bootcamp",
        "Other Vocational / Trade Program or Apprenticeship",
        "Post Doctorate",
        "Other",
        "I'm not currently a student",
        "Prefer not to answer",
    ]
    university: str = Field(default="", max_length=160)
    major: Literal[
        "Computer science, computer engineering, or software engineering",
        "Another engineering discipline (such as civil, electrical, mechanical, etc.)",
        "Information systems, information technology, or system administration",
        "A natural science (such as biology, chemistry, physics, etc.)",
        "Mathematics or statistics",
        "Web development or web design",
        "Business discipline (such as accounting, finance, marketing, etc.)",
        "Humanities discipline (such as literature, history, philosophy, etc.)",
        "Social science (such as anthropology, psychology, political science, etc.)",
        "Fine arts or performing arts (such as graphic design, music, studio art, etc.)",
        "Health science (such as nursing, pharmacy, radiology, etc.)",
        "Other (please specify)",
        "Undecided / No Declared Major",
        "My school does not offer majors / primary areas of study",
        "Prefer not to answer",
        "",
    ] = ""
    major_other: str = Field(default="", max_length=120)
    hackathon_participation: Literal["Yes", "No", ""] = ""
    gender: Literal["Male", "Female", "Other", ""] = ""
    gender_other: str = Field(default="", max_length=80)
    pronouns: Literal["She/Her", "He/Him", "They/Them", "She/They", "He/They", "Prefer Not to Answer", "Other", ""] = ""
    pronouns_other: str = Field(default="", max_length=80)
    dietary_notes: Literal["None", "Vegetarian", "Vegan", "Celiac Disease", "Allergies", "Kosher", "Halal", "Other", ""] = ""
    dietary_notes_other: str = Field(default="", max_length=160)
    mlh_code_of_conduct: bool
    mlh_data_authorization: bool
    mlh_marketing_emails: bool = False

    # Honeypot: a field real applicants never see or fill, so anything here
    # means a bot filled it in. Excluded from the rows written to Sheets/Supabase.
    website: str = Field(default="", max_length=200, exclude=True)

    @model_validator(mode="after")
    def validate_other_fields(self):
        if self.website:
            raise ValueError("Spam detected")
        if not self.first_name.strip():
            raise ValueError("First name cannot be blank")
        if not self.last_name.strip():
            raise ValueError("Last name cannot be blank")
        if ".." in self.discord_username:
            raise ValueError("Discord usernames cannot contain consecutive periods")
        if self.classification in UNIVERSITY_LEVELS and not self.university.strip():
            raise ValueError("Please provide your university")
        if self.major == "Other (please specify)" and not self.major_other.strip():
            raise ValueError("Please specify your major")
        if self.gender == "Other" and not self.gender_other.strip():
            raise ValueError("Please enter your gender when Other is selected")
        if self.pronouns == "Other" and not self.pronouns_other.strip():
            raise ValueError("Please enter your pronouns when Other is selected")
        if self.dietary_notes in ("Allergies", "Other") and not self.dietary_notes_other.strip():
            raise ValueError("Please provide additional dietary information")
        if not self.mlh_code_of_conduct:
            raise ValueError("You must agree to the MLH Code of Conduct")
        if not self.mlh_data_authorization:
            raise ValueError("You must authorize application data sharing")
        return self


def get_sheets_service():
    if SERVICE_ACCOUNT_JSON:
        credentials = service_account.Credentials.from_service_account_info(
            json.loads(SERVICE_ACCOUNT_JSON),
            scopes=[GOOGLE_SHEETS_SCOPE],
        )
    elif os.path.exists(SERVICE_ACCOUNT_FILE):
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE,
            scopes=[GOOGLE_SHEETS_SCOPE],
        )
    else:
        logger.warning(
            "No Google Sheets credentials found (checked GOOGLE_SERVICE_ACCOUNT_JSON and %s)",
            SERVICE_ACCOUNT_FILE,
        )
        raise HTTPException(
            status_code=503,
            detail=(
                "Google Sheets is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (the key file's "
                "contents) or GOOGLE_SERVICE_ACCOUNT_FILE (a path to it), and share the spreadsheet "
                "with that service account."
            ),
        )

    credentials.refresh(Request())
    return build("sheets", "v4", credentials=credentials, cache_discovery=False)


def get_supabase_client():
    if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
        return None
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def write_to_supabase(application: Application):
    client = get_supabase_client()
    if client is None:
        logger.warning(
            "Skipping Supabase write: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured"
        )
        return

    row = application.model_dump() if hasattr(application, "model_dump") else application.dict()
    row["submitted_at"] = datetime.now(timezone.utc).isoformat()

    try:
        client.table(SUPABASE_APPLICATIONS_TABLE).insert(row).execute()
    except Exception:
        logger.exception(
            "Failed to write application from %s to Supabase table %s",
            application.email,
            SUPABASE_APPLICATIONS_TABLE,
        )


def application_values(application: Application):
    values = application.model_dump() if hasattr(application, "model_dump") else application.dict()
    return [[
        datetime.now(timezone.utc).isoformat(),
        values["first_name"],
        values["middle_name"],
        values["last_name"],
        values["age"],
        values["email"],
        values["country_of_residence"],
        values["discord_username"],
        values["linkedin_url"],
        values["phone_number"],
        values["classification"],
        values["university"],
        values["major"],
        values["major_other"],
        values["hackathon_participation"],
        values["gender"],
        values["gender_other"],
        values["pronouns"],
        values["pronouns_other"],
        values["dietary_notes"],
        values["dietary_notes_other"],
        values["mlh_code_of_conduct"],
        values["mlh_data_authorization"],
        values["mlh_marketing_emails"],
    ]]


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "storage": "google-sheets",
        "configured": bool(
            SPREADSHEET_ID and (SERVICE_ACCOUNT_JSON or os.path.exists(SERVICE_ACCOUNT_FILE))
        ),
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY),
    }


@app.post("/api/applications", status_code=201)
def create_application(application: Application):
    logger.info(
        "Received application submission: %s %s <%s>",
        application.first_name,
        application.last_name,
        application.email,
    )

    if not SPREADSHEET_ID:
        logger.warning("Rejected submission: GOOGLE_SHEETS_SPREADSHEET_ID is not configured")
        raise HTTPException(status_code=503, detail="Google Sheets spreadsheet ID is not configured")

    service = get_sheets_service()
    try:
        result = service.spreadsheets().values().append(
            spreadsheetId=SPREADSHEET_ID,
            range=SHEETS_RANGE,
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body={"values": application_values(application)},
        ).execute()
    except Exception:
        logger.exception(
            "Failed to append application from %s to spreadsheet %s",
            application.email,
            SPREADSHEET_ID,
        )
        raise HTTPException(
            status_code=502,
            detail="We could not save your application to Google Sheets. Please try again shortly.",
        )

    updated_range = result.get("updates", {}).get("updatedRange")
    logger.info(
        "Accepted application submission: %s %s <%s> appended at %s",
        application.first_name,
        application.last_name,
        application.email,
        updated_range,
    )

    write_to_supabase(application)

    return {
        "updated_range": updated_range,
        "message": "Application received",
    }

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
    res = table.select("id, email, user_id, discord_id, role").eq("user_id", auth_user_id).execute()
    if res.data:
        return res.data[0]

    # Match by previously filled Discord ID
    if discord_id:
        res = table.select("id, email, user_id, discord_id, role").eq("discord_id", discord_id).execute()
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
    conditions = []
    if email:
        conditions.append(f"email.eq.{email}")
    if discord_username:
        conditions.append(f"discord_username.eq.{discord_username}")

    if not conditions:
        return None

    res = table.select("id, email, user_id, discord_id, discord_username, role").or_(",".join(conditions)).execute()
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
        response = query.or_(f"email.eq.{email},discord_username.eq.{discord_username}").execute()
    elif email:
        response = query.eq("email", email).execute()
    elif discord_username:
        response = query.eq("discord_username", discord_username).execute()
    else:
        return False

    return len(response.data) > 0

@app.get("/api/auth/me")
def auth_me(authorization: str | None = Header(default=None)):
    user = get_authenticated_user(authorization)

    user_email = user.email
    user_metadata = user.user_metadata or {}

    provider = user.app_metadata.get("provider")
    discord_id = user_metadata.get("sub") if provider == "discord" else None
    discord_username = user_metadata.get("preferred_username") if provider == "discord" else None

    # Retrieve record and update linked metadata fields
    app_record = get_and_backfill_user(
        auth_user_id=user.id,
        email=user_email,
        discord_id=discord_id,
        discord_username=discord_username,
    )

    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not found in registration database. You must apply first."
        )

    return {
        "authenticated": True,
        "user_id": user.id,
        "email": user_email,
        "role": app_record.get("role", "hacker"),
        "registered": True,
    }


@app.post("/api/auth/request-password-setup")
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
                "redirect_to": f"{frontend_url}/portal/setup-login"
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

@app.post("/api/auth/verify-and-grant-access")
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