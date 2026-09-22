import json
import logging
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Literal

from dotenv import load_dotenv

# Must run before importing db (and anything that imports db) -- those
# modules read SUPABASE_URL/etc. from the environment at import time.
load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, Query, status, Request as FastAPIRequest
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build

from db import get_supabase_client, escape_ilike, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_APPLICATIONS_TABLE
from auth import router as auth_router, get_current_participant
from repository import Participant
from schedule import router as schedule_router
from announcements import router as announcements_router
from meals import router as meals_router
from teams import router as teams_router

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

app.include_router(auth_router)
app.include_router(schedule_router)
app.include_router(announcements_router)
app.include_router(meals_router)
app.include_router(teams_router)

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

# --- Day-of check-in (staff tool) ---
#
# Organizer-facing lookup + check-in for registrants already in the
# `applications` table. Gated by the same Supabase auth as the rest of the
# portal (get_current_participant) plus an organizer-role check, since
# checking someone in is what then lets auth.get_current_participant let
# them log into the portal themselves.

REGISTRANT_FIELDS = "id, first_name, last_name, email, checked_in, checked_in_at"


class Registrant(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    checked_in: bool
    checked_in_at: str | None = None


def require_organizer(participant: Participant = Depends(get_current_participant)) -> Participant:
    if not participant.is_organizer:
        raise HTTPException(status_code=403, detail="Only organizers can access check-in.")
    return participant


def _require_supabase():
    client = get_supabase_client()
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        )
    return client


def _ilike_pattern(term: str) -> str:
    return f"%{escape_ilike(term)}%"


@app.get("/api/checkin/search", response_model=list[Registrant])
def search_registrants(
    q: str = Query(min_length=1, max_length=254),
    _: Participant = Depends(require_organizer),
):
    client = _require_supabase()
    table = client.table(SUPABASE_APPLICATIONS_TABLE)
    query = q.strip()

    if "@" in query:
        # Email is the unique identifier, so treat it as an exact
        # (case-insensitive) lookup rather than a fuzzy match.
        result = table.select(REGISTRANT_FIELDS).ilike("email", query).limit(5).execute()
        return result.data

    # Fall back to name search: require every whitespace-separated token to
    # appear somewhere in the first/last name, without building a raw
    # PostgREST filter string out of user input.
    tokens = [t for t in query.split() if t]
    candidates: dict[str, dict] = {}
    for token in tokens:
        pattern = _ilike_pattern(token)
        for column in ("first_name", "last_name"):
            rows = table.select(REGISTRANT_FIELDS).ilike(column, pattern).limit(50).execute().data
            for row in rows:
                candidates[row["id"]] = row

    def matches_all_tokens(row: dict) -> bool:
        haystack = f"{row['first_name']} {row['last_name']}".lower()
        return all(token.lower() in haystack for token in tokens)

    return [row for row in candidates.values() if matches_all_tokens(row)][:20]


@app.post("/api/checkin/{registrant_id}", response_model=Registrant)
def check_in_registrant(registrant_id: str, _: Participant = Depends(require_organizer)):
    client = _require_supabase()
    now = datetime.now(timezone.utc).isoformat()

    result = (
        client.table(SUPABASE_APPLICATIONS_TABLE)
        .update({"checked_in": True, "checked_in_at": now})
        .eq("id", registrant_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Registrant not found")

    row = result.data[0]
    logger.info("Checked in registrant %s <%s>", registrant_id, row.get("email"))
    return row


@app.get("/api/checkin/verify")
def verify_checked_in(email: str = Query(min_length=5, max_length=254)):
    # Intentionally unauthenticated (unlike search/check-in above): kept for
    # any client that wants a plain boolean without a full participant
    # lookup. auth.get_current_participant enforces the actual login gate.
    client = _require_supabase()
    result = (
        client.table(SUPABASE_APPLICATIONS_TABLE)
        .select("checked_in")
        .ilike("email", email.strip())
        .limit(1)
        .execute()
    )
    checked_in = bool(result.data and result.data[0]["checked_in"])
    return {"checked_in": checked_in}
