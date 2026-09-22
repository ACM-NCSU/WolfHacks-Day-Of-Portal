# Testing the Team Dashboard (#4)

Branch: `feature/team-dashboard` ([PR #8](https://github.com/ACM-NCSU/WolfHacks-Day-Of-Portal/pull/8))

## Setup

This now runs against a real Postgres database, in a **separate dev Supabase
project** — never the shared production one (see plan.md, Phase 4 decisions).

1. Create a dev Supabase project (or reuse one you already made for this).
2. In its SQL editor, run `backend/supabase_schema.sql`, then
   `backend/supabase_dev_bootstrap.sql`, then `backend/seed_dev_data.sql`, in
   that order.
3. Fill in `backend/.env` with that project's `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).

```bash
git pull
npm install

cd backend
python3 -m venv .venv && source .venv/bin/activate   # skip if the venv already exists
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

In a second terminal, from the repo root:

```bash
npm run dev
```

Open **http://localhost:5173/team**.

**To reset back to the seed state** at any point, re-run
`backend/seed_dev_data.sql` in the Supabase SQL editor — it deletes and
recreates the six accounts and the one seed team.

## Logging in

Portal login is real Supabase auth now (email/password or Discord), not a
stub — set `DEBUG=true` in `backend/.env` so `POST /api/auth/request-password-setup`
returns a `debug_link` you can open directly instead of needing an email
provider wired up. These accounts are pre-seeded:

| Email | State |
|---|---|
| `jordan@ncsu.edu` | leader of "Wolfpack Coders" |
| `taylor@ncsu.edu` | member of "Wolfpack Coders" |
| `alex@ncsu.edu` | has a pending invite to "Wolfpack Coders" |
| `sam@ncsu.edu` | checked in, no team |
| `morgan@ncsu.edu` | checked in, no team (invite target) |
| `casey@ncsu.edu` | not checked in — should be blocked from logging in |
| anything else | not registered — should show that message |

At **http://localhost:5173/portal/login**, click "Set up your password",
enter one of the emails above, and open the `debug_link` from the backend's
response (or the network tab) to set a password, then log in normally.

Ids are real Postgres uuids; if you're hitting the API directly with curl,
grab ids from `backend/seed_dev_data.sql` or a `GET /api/team/me` response.

## Things to try

- Log in as `jordan` → create/view team, set a track + challenges, invite `sam` or `morgan` by searching their name/email.
- Log out, log in as the person you invited → accept the invite, confirm you're now on the team.
- Log back in as `jordan` → confirm the roster updated.
- Leave the team as `jordan` (leader) → confirm leadership transfers to `taylor`, not deleted.
- Try `casey` and a random email → confirm the login error messages make sense.
- Toggle light/dark mode while on `/team`.
- Try to break it: invite someone already on a team, fill a team to 4 and try a 5th, submit a blank team name, refresh mid-flow.
- **Restart `uvicorn` mid-walkthrough** — the team should still be there. That's the whole point of this phase.
- Open `/team` in two browser profiles (or one normal + one incognito), log in as two different people, and send an invite from one — it should show up in the other within about 10 seconds without touching anything (polling, not a manual refresh). Watch the Network tab: one `/api/team/me` request every 10s, and none while the tab is backgrounded.
- **Every action should feel instant, in one network request.** Watch the Network tab while creating a team, inviting, accepting, declining, canceling, leaving, and changing track/challenges — each should fire exactly one request and update the screen the moment it resolves, not two requests with a pause between them.
- **Cross-session check** (this is a real bug that was fixed, not a hypothetical): throttle the network (DevTools → Slow 3G), start an action (e.g. leave a team) as one person, and *before* it finishes, log out and log in as someone else. The new person must never briefly see the previous person's data.

If you accidentally create a team with a wrong/junk name while testing (e.g.
pasting the wrong thing into the "team name" field), just leave it — leaving
an empty team deletes it — rather than leaving stray teams in the database.
A team you can't get back into any other way can be deleted directly in the
Supabase table editor (`teams` table), which cascades to its members/invites.

## Known limitations (not bugs)

- Live updates are polling-based (every ~10s), not instant — see plan.md Phase 4 for why Realtime was deliberately skipped this round.

## Reporting issues

Comment on [PR #8](https://github.com/ACM-NCSU/WolfHacks-Day-Of-Portal/pull/8) or ping directly.
