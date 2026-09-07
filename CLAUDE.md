# WolfHacks Day-Of Portal

## Project aim
A day-of portal for WolfHacks (ACM @ NC State's hackathon) that hackers and
organizers use during the event. Five features are being built out (GitHub
issues on `ACM-NCSU/WolfHacks-Day-Of-Portal`):

1. Event Check-In (#1) — mark registrants as checked in; only checked-in
   people can log into the portal.
2. Announcement Feature (#2) — organizers broadcast announcements to the
   portal + a Discord webhook.
3. Live Schedule (#3) — real-time event schedule, organizer-adjustable.
4. **Team Dashboard (#4) — this is my task, see below.**
5. Log in Flow / Auth (#5) — unified login for hackers (email or Discord
   OAuth2) and organizers (whitelisted email), gated on check-in status.

## Stack (existing, as of 2026-08-31)
- **Frontend**: React 18 + Vite, deployed as a static build. Components live
  in `src/components/`, copy/config in `src/data/siteConfig.js`.
- **Backend**: FastAPI (`backend/main.py`), single service, deployed
  alongside the frontend on one Vercel project (`/api/*` routed to it via
  `vercel.json`).
- **Database**: Supabase (Postgres). Schema lives in
  `backend/supabase_schema.sql` and is hand-migrated with `alter table`
  statements appended over time (no migration framework yet). The only table
  today is `applications` (registration form submissions) — no `users`,
  `hackers`, or `teams` tables exist yet.
- Backend writes to Supabase using the **service role key** (bypasses RLS) —
  only ever server-side.
- No auth system is implemented yet. Issue #5 (login) is assigned to Bela
  and not yet built.

## My task: Team Dashboard (issue #4)
Goal: a dashboard that entirely handles team management for hackers.

Requirements (from the issue, verbatim):
- If I'm a hacker, I can create a team as the team leader and give it a name.
- If I'm a hacker, I can invite other hackers to my team by searching their
  name/email.
- If I'm a hacker, I can accept or decline a team invite, and can only be in
  one team at a time.
- If I'm a team leader, I can choose my team's track and challenges.
- If I'm a hacker, I can leave a team.
- The dashboard should display all info a team would need about itself:
  members, track, challenge, team name.

Full implementation plan (scope, design, 24 numbered tickets TD-01..TD-24,
schema, verification steps) lives at `plan.md` in this repo root, also
mirrored at `/Users/samarth/.claude/plans/whimsical-meandering-sunset.md`.
**plan.md is the source of truth for task status — update it as tickets close.**

### Decisions made
| Question | Decision |
|---|---|
| Identity before #5 ships | Minimal stub auth (email-only, no password), swappable behind `get_current_participant` |
| Who can be invited | New `participants` table, seeded from checked-in applications |
| Invite mechanism | In-app search over checked-in hackers — confirmed NOT an outbound email invite |
| Tracks/challenges source | Hardcoded config (`siteConfig.js`), not DB tables |
| Max team size | 4 |
| Leader leaves | Leadership auto-transfers to earliest-joined member; team deletes if they were last |
| Live updates | Supabase Realtime, treated as a "something changed" ping — always re-fetch from FastAPI, never trust the payload |
| Invite notification | In-app only for v1 (a Discord webhook can't DM a person; no email provider configured yet) |
| Track/challenge shape | One track, many challenges |
| Design | Directly in code on the landing page's existing tokens/components, reviewed live — no separate mockup |

### Ticket status (see plan.md for full ticket detail)
- [x] **Phase 1 — shared groundwork** (TD-01..05, also unblocks #3):
      `src/lib/api.js`, extract `SelectField`, `/team` route, `siteConfig.js`
      tracks/challenges, git remote fixed to HTTPS.
- [x] **Phase 2 — dashboard UI on mock data** (TD-06..13): mock backend
      (`src/data/mockTeamState.js`), session hook + stub login, dashboard
      shell, overview / create / invite search / pending invites / track
      picker. `/team` is fully click-through against mock data — see plan.md
      "How to test Phase 2" for the seeded mock accounts.
- [x] **Phase 3 — backend** (TD-14..19): endpoints in `backend/teams.py` +
      `backend/auth_stub.py`, on an in-memory repository
      (`backend/repository.py`, same seam as the frontend mock) — no live
      Supabase needed until Phase 4's TD-21 swaps it. Verified end to end
      with `uvicorn` + curl (see commit `2551d7d` for the full test list).
- [x] **Phase 3.5 — wire frontend to real backend** (TD-19b): frontend calls
      `src/lib/teamApi.js` -> real FastAPI endpoints now; `mockTeamState.js`
      deleted. Still zero Supabase — persistence is still
      `backend/repository.py`'s in-memory store.
- [ ] **Phase 4 — DB + realtime** (TD-20..24): `[blocked on Arjun+Bela sign-off]`
      agree + apply schema, dev seed script, realtime wiring, sync docs.

As of 2026-09-07: Phases 1, 2, 3, and 3.5 built — frontend and backend are one
connected system now, verified with both dev servers running (including the
CORS preflight for PATCH/DELETE + Authorization, which curl-only backend
testing wouldn't catch). **Not yet visually smoke-tested in an actual browser
this session** (browser tooling declined) — do the walkthrough in plan.md
"How to test Phase 2" (same accounts, now hitting the real API) before
trusting this fully. Only Phase 4 (real Supabase) remains, and it's blocked
on Arjun/Bela sign-off on the shared `participants` table.

### Coordination contract with other issues
- **#1 (Arjun, check-in)**: shares the `participants` table. Arjun owns
  seeding it and writing `checked_in`; team code only ever reads that flag.
  DDL must be agreed before it's applied to Supabase.
- **#5 (Bela, login)**: our stub auth is a placeholder, isolated in
  `backend/auth_stub.py` behind one dependency. No FK to `auth.users` so
  Bela's choice of auth mechanism stays open. Zero team endpoints change
  when the real thing lands.
- **#3 (Sarthak, schedule)**: likely needs the same API client, portal
  routing, and Supabase Realtime pattern — offered to land those shared
  pieces once instead of duplicating.

## Open questions for the team
Not blocking Phase 1/2. Full detail (why, and what depends on the answer) is
in plan.md under "Questions to pose to the team".
- **Cooper**: track vs. sponsor-challenge structure; can hackers stay
  team-less; is organizer team admin in scope; does composition lock at some
  point.
- **Arjun**: does the `participants` shape work for check-in; how to dedupe
  `applications` (no unique email constraint today); is there a waitlist
  state beyond boolean `checked_in`.
- **Bela**: Supabase Auth vs. custom session; does organizer whitelist reuse
  `participants.role`; confirm the stub-swap contract; store the Discord
  snowflake ID (not just username) if doing OAuth.
- **Sarthak**: share `src/lib/api.js` / `src/lib/supabase.js` / routing;
  align on the realtime-as-ping pattern.
- **#2 owner (unassigned)**: is there an actual Discord bot (vs. only a
  webhook), and any email provider, for invite notifications later.
