# Testing the Team Dashboard (#4)

Branch: `feature/team-dashboard` ([PR #8](https://github.com/ACM-NCSU/WolfHacks-Day-Of-Portal/pull/8))

## Setup

```bash
git fetch origin
git checkout feature/team-dashboard
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

## Logging in

Just type an email, no password. These accounts are pre-seeded:

| Email | State |
|---|---|
| `jordan@ncsu.edu` | leader of "Wolfpack Coders" |
| `taylor@ncsu.edu` | member of "Wolfpack Coders" |
| `alex@ncsu.edu` | has a pending invite to "Wolfpack Coders" |
| `sam@ncsu.edu` | checked in, no team |
| `morgan@ncsu.edu` | checked in, no team (invite target) |
| `casey@ncsu.edu` | not checked in — should be blocked from logging in |
| anything else | not registered — should show that message |

## Things to try

- Log in as `jordan` → create/view team, set a track + challenges, invite `sam` or `morgan` by searching their name/email.
- Log out, log in as the person you invited → accept the invite, confirm you're now on the team.
- Log back in as `jordan` → confirm the roster updated.
- Leave the team as `jordan` (leader) → confirm leadership transfers to `taylor`, not deleted.
- Try `casey` and a random email → confirm the login error messages make sense.
- Toggle light/dark mode while on `/team`.
- Try to break it: invite someone already on a team, fill a team to 4 and try a 5th, submit a blank team name, refresh mid-flow.

## Known limitations (not bugs)

- No real database yet — restarting the backend wipes everything back to the seed accounts above.
- A second browser tab won't live-update until you refresh; realtime isn't wired up yet.

## Reporting issues

Comment on [PR #8](https://github.com/ACM-NCSU/WolfHacks-Day-Of-Portal/pull/8) or ping directly.
