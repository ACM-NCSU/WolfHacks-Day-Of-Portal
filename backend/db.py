import os

from supabase import create_client

# Shared Supabase connection, split out of main.py so auth.py, teams.py,
# schedule.py, and announcements.py can all use it without importing main
# (which would create a circular import, since main imports their routers).
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_APPLICATIONS_TABLE = os.getenv("SUPABASE_APPLICATIONS_TABLE", "applications")


def get_supabase_client():
    if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
        return None
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def escape_ilike(term: str) -> str:
    # Escape PostgREST/SQL LIKE wildcards in user input before wrapping it in
    # our own wildcards, so a search for "50% off" or "a_b" can't widen the match.
    return term.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")
