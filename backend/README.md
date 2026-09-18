# WolfHacks Backend

Minimal FastAPI server for the WolfHacks frontend.

## Setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

Server runs at `http://127.0.0.1:8000`. Check it's alive:

```bash
curl http://127.0.0.1:8000/api/health
```

Applications are submitted as JSON to `POST /api/applications` and appended to the configured Google Sheet. Create an `Applications` worksheet with this header row:

```text
Submitted at | First name | Middle Name | Last name | Age | Email | Country Of Residence | Discord Username | Phone number | Currently enrolled | University | Classification | Major | Hackathon before | Gender | Other gender | Pronouns | Other pronouns | Dietary Restrictions | Other dietary restrictions | MLH Code of Conduct | MLH Data Authorization | MLH Marketing Emails
```

Create a Google Cloud service account, enable the Google Sheets API, download
its JSON key, and share the spreadsheet with the service account email as an
Editor. Keep the JSON key outside version control.

## Environment variables

Copy `.env.example` to `.env` and fill in your values — `.env` is gitignored
and loaded automatically on startup:

```bash
cp .env.example .env
```

```dotenv
# Google Sheets
GOOGLE_SERVICE_ACCOUNT_FILE=C:\secrets\wolfhacks-sheets.json
GOOGLE_SHEETS_SPREADSHEET_ID=1ckYK82T8wayiCLtluOkQek4gQ4lwwE2WEvyWRLR6I3M
GOOGLE_SHEETS_RANGE=Applications!A:X

# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-or-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# App
WOLFHACKS_ALLOWED_ORIGINS=http://localhost:5173
WOLFHACKS_LOG_LEVEL=INFO
```

The default CORS origins are the local Vite URLs. The API never sends Google
or Supabase credentials to the browser. `SUPABASE_SERVICE_ROLE_KEY` bypasses
row-level security — only ever use it server-side, never in frontend code.

## Deploying on Vercel

This repo deploys as a single Vercel project using [Services](https://vercel.com/docs/services):
the Vite frontend and this FastAPI backend build and deploy together, on one
domain, with `/api/*` routed to the backend (see `vercel.json` at the repo root).

Because the backend has no persistent filesystem in a deployed function, it
can't read a service-account key from a local file path. Instead, set
`GOOGLE_SERVICE_ACCOUNT_JSON` in the Vercel project's environment variables to
the **full contents** of the service-account JSON key file (paste the whole
JSON object as the value). `main.py` checks `GOOGLE_SERVICE_ACCOUNT_JSON`
first and only falls back to `GOOGLE_SERVICE_ACCOUNT_FILE` when it's unset, so
local dev (which still uses a file on disk) is unaffected.

Also set `GOOGLE_SHEETS_SPREADSHEET_ID` (and `GOOGLE_SHEETS_RANGE` if it
differs from the default) in the same place. `WOLFHACKS_ALLOWED_ORIGINS`
generally isn't needed in production — the frontend calls `/api/...` as a
relative path, so requests are same-origin and never trigger CORS.

## Team dashboard (issue #4)

`auth_stub.py` and `teams.py` add the endpoints behind the `/team` page in
the frontend. Persistence is **Supabase Postgres** (`repository.py`) as of
Phase 4 — team identity is the existing `applications` table (the columns
`checked_in`, `user_id`, `discord_id`, `role` come from issues #1 and #5;
this repo reads them and never writes them). There is no separate
`participants` table.

Team tables (`teams`, `team_members`, `team_invites`) and the
`participant_directory` view live in `backend/supabase_dev_bootstrap.sql`.
Run `supabase_schema.sql` then `supabase_dev_bootstrap.sql` then
`seed_dev_data.sql` in a **dev** Supabase project's SQL editor — never the
shared production one — then set `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` in `.env` to that dev project. See
`docs/testing-team-dashboard.md` for the full walkthrough.

Set `WOLFHACKS_SESSION_SECRET` in `.env` (any string for local dev) or the
stub login falls back to an insecure default and logs a warning. The stub
itself (`auth_stub.py`) is unchanged by this — only its lookup now hits
Supabase instead of an in-memory list.

Seeded accounts (`backend/seed_dev_data.sql`): `jordan@ncsu.edu` leads
"Wolfpack Coders", `taylor@ncsu.edu` is a member, `alex@ncsu.edu` has a
pending invite, `sam@ncsu.edu` / `morgan@ncsu.edu` are checked in with no
team, `casey@ncsu.edu` is registered but not checked in.

Live updates on `/team` are done by the frontend polling `GET /api/team/me`
every ~10s, not Supabase Realtime — see plan.md Phase 4 for why.

**Responsiveness pass (post-Phase-4):** testing against a real dev project
surfaced two problems, both fixed. First, a real bug — `useTeamState.js`'s
staleness guard didn't invalidate in-flight requests on logout, so a slow
response from a just-logged-out session could briefly render under the next
person's login; fixed by bumping its sequence counter unconditionally.
Second, every action felt sluggish because of sheer round-trip count: each
Supabase call built a brand-new client (repeated TLS handshakes), and four
mutating endpoints fetched the *entire* team state just to check who the
leader was. `repository.py` now reuses one client for the process lifetime
and exposes `get_team_role()`, a 2-query leadership check, in place of that.
The frontend mirrors this: every mutation (create, invite, accept, decline,
cancel, leave, track/challenge changes) now applies the backend's own
response directly to local state instead of triggering a second full
refetch — see `useTeamState.js`'s `setTeam`/`setIncomingInvites`/
`setOutgoingInvites`, which are identity-guarded so a mutation response
can't reopen the same cross-session staleness bug through a different path.

```bash
# Log in and grab a token
curl -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" -d '{"email": "jordan@ncsu.edu"}'

# Use it
TOKEN=<paste the token from above>
curl -s http://127.0.0.1:8000/api/team/me -H "Authorization: Bearer $TOKEN"
```

Endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/team/me`,
`GET /api/participants/search?q=`, `POST /api/teams`, `PATCH /api/teams/{id}`,
`DELETE /api/teams/{id}/members/me`, `POST /api/teams/{id}/invites`,
`DELETE /api/teams/{id}/invites/{invite_id}`, `POST /api/invites/{id}/accept`,
`POST /api/invites/{id}/decline`.

`auth_stub.py` is a temporary placeholder for issue #5 (real login) — see its
module docstring for the swap contract before changing it.
