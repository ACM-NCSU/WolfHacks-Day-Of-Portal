import os
from functools import lru_cache

from supabase import create_client

# Shared Supabase connection, split out of main.py so auth.py, teams.py,
# schedule.py, and announcements.py can all use it without importing main
# (which would create a circular import, since main imports their routers).
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_APPLICATIONS_TABLE = os.getenv("SUPABASE_APPLICATIONS_TABLE", "applications")


@lru_cache(maxsize=1)
def get_supabase_client():
    # create_client() builds several sub-clients (auth/postgrest/storage) and
    # their own HTTP connection pools -- constructing it fresh on every call
    # (every request touched this at least twice, via get_authenticated_user
    # and get_and_backfill_user) added seconds of latency per request. Cached
    # for the life of the process instead; env vars don't change at runtime.
    if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
        return None
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def escape_ilike(term: str) -> str:
    # Escape PostgREST/SQL LIKE wildcards in user input before wrapping it in
    # our own wildcards, so a search for "50% off" or "a_b" can't widen the match.
    return term.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")
