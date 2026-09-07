# Team Dashboard (issue #4) — Implementation Tickets

## Context

WolfHacks' day-of portal is being built by five people in parallel, one GitHub
issue each. I own **#4, Team Dashboard**. The repo today is only a landing page
(React 18 + Vite, hand-rolled routing in `src/App.jsx`, one FastAPI service in
`backend/main.py`, one Postgres table `applications`). There is no identity
table, no auth, no session, and no portal shell — and issues #1 (check-in) and
#5 (login) that would provide them are both unbuilt.

So this work has to stand up on its own without blocking on anyone, while not
building anything that belongs to someone else. That tension is what the scope
section below exists to manage.

---

## The one thing I am building

**The hacker-facing team management surface at `/team`.** Nothing else.

From issue #4, verbatim — this is the complete feature:
- Create a team as leader and name it
- Invite other hackers **by searching their name/email** (in-app search over
  checked-in hackers; confirmed — not an outbound email invite)
- Accept or decline an invite; be in only one team at a time
- As leader, choose the team's track and challenges
- Leave a team
- See all team info: name, members, track, challenges

Plus the **minimum scaffolding** to run that standalone before #1 and #5 exist:
a stub login, the `participants` table, and a shared API client.

### Explicitly NOT mine — do not build, do not touch

| Belongs to | Don't build |
|---|---|
| #1 Arjun | Check-in UI, seeding `participants` from `applications`, writing `checked_in`, waitlist |
| #5 Bela | Real login, Discord OAuth, password/session design, organizer authorization, the organizer page |
| #2 unassigned | Announcements feed, Discord webhook sending |
| #3 Sarthak | The live schedule |
| Nobody yet | Judging, project submissions, organizer-side team admin (view/edit/dissolve teams) |

### Shared code — coordinate, don't duplicate
- **`participants` table** — #1 and #5 need the same one. I define it, they
  sign off, **Arjun owns writing `checked_in`; I only ever read it.**
- **`backend/auth_stub.py`** — temporary, replaced by #5. Isolated behind one
  dependency (`get_current_participant`) so Bela swaps internals only.
- **`src/lib/api.js`, `src/lib/supabase.js`, `/team` routing** — #3 needs these
  too. I build them first; offer them to Sarthak rather than both writing one.

---

## Design

**Process:** designed directly in code against the existing token system, then
reviewed live in the browser (`npm run dev`) — no separate mockup step. The
landing page already has a complete design language; the dashboard inherits it
rather than inventing one.

**Inherited from `src/index.css` — no new visual decisions needed:**
- Palette: tokens only (`--ink-raised` surfaces, `--line` borders, `--card`
  translucent panels, `--red` as the single accent, `--steel-dark` for
  secondary text). Using only tokens means light mode works for free.
- Type: `--font-display` (Fraunces) for the team name and headings,
  `--font-body` (Inter Tight) for prose, `--font-mono` (IBM Plex Mono) for
  labels, eyebrows, and buttons — matching `.eyebrow` and `.btn`.
- Panels: reuse the `.application-form` treatment — `1px solid var(--line)`
  on `var(--card)`, 2px radius, 28px padding.
- Page chrome: `<Starfield />` + `<ThemeToggle />` + `.container`, exactly how
  `ApplyPage` and `ThankYouPage` each set themselves up.
- Motion: framer-motion with the stagger variants already duplicated in
  `Register.jsx` / `Faq.jsx` (`staggerChildren: 0.09`, items fade up 14px),
  every one guarded by `useReducedMotion()`.
- Errors: `var(--red)` — **not** the hardcoded `#ff8b8b` in
  `.application-form__field-error`, which is dark-mode-only.

**Layout:** one column, max-width 760px (matching `.application-form`), stacked
cards. No sidebar, no tabs — the dashboard is short enough to read top to
bottom on a phone, which is how most people will use it during the event.

### New CSS to add (everything else is reused)

Almost all of this is existing primitives. Only three new blocks are needed:

| Class | What | Basis |
|---|---|---|
| `.team-page`, `.team-page__container/__back/__intro` | page frame | direct mirror of `.apply-page*` |
| `.team-card`, `.team-card__title` | the stacked panel every block sits in | copy of `.application-form`'s treatment: `1px solid var(--line)` on `var(--card)`, 2px radius, 28px pad; title is `--font-mono` 13px `--steel` uppercase |
| `.team-chip`, `.team-chip--selected` | track/challenge pills + the leader's challenge toggles | `--ink-raised` bg, `--line` border, 2px radius; selected = `--red` bg / `--cream` text |
| `.team-member`, `.team-invite`, `.team-count` | roster rows, invite rows, the `3/4` counter | plain flex rows on `--line` dividers |

**One genuinely new shared primitive:** the site has only `.btn--primary`
today, but the dashboard needs a secondary/destructive action (*Leave team*,
*Decline*, *Cancel*). Add **`.btn--ghost`** next to `.btn--primary` in
index.css — transparent background, `1px solid var(--line)`, `--paper` text,
going to `--red` border and text on hover. Shared, not one-off, so #1/#2/#3
get it too.

**Reused as-is, no new CSS:** `.container`, `.eyebrow`, `.section__heading`,
`.section__lede`, `.btn`/`.btn--primary`, `.required-marker`, the
`.application-form` input rule, and — for the invite search results dropdown —
`.application-form__searchable` / `__dropdown` / `__dropdown-item`, the exact
classes `SelectField` and the country/university comboboxes already use.

### The five screens

**1 · Not logged in** — a single centered card. Email field + Continue.
Renders #5's three outcomes as inline messages so the real login can reuse the
copy: *checked in* (proceed), *registered but not checked in* ("you're
registered — see an organizer to check in"), *not registered* ("this email
isn't in our registrant list").

**2 · Logged in, no team, no invites** — page heading, then two cards:
*Create a team* (name input + button) and a quiet empty-state note explaining
that a leader can also invite you by searching your name or email.

**3 · Logged in, no team, with invites** — same as 2, with a *Pending invites*
list placed **above** the create card (acting on an invite is the more urgent
action). Each row: team name, who invited you, member count (`2/4`), and
Accept / Decline.

**4 · On a team, member view** — one *Team* card:
team name in display type, track shown as a chip, challenges as chips below,
then the member list (name, email, leader badge), with the count `3/4`
visible. A secondary *Leave team* button at the bottom, behind a confirm step.
Members see no editing controls at all.

**5 · On a team, leader view** — everything in 4, plus three leader-only
blocks in this order:
- *Track & challenges* — `SelectField` for the single track, chip toggles for
  the many challenges.
- *Invite teammates* — search input with a results dropdown (name + email),
  Invite action per result. Disabled with an explanatory line when the team is
  full at 4.
- *Sent invites* — outgoing pending invites, each with Cancel.

Leaving as leader shows an extra line in the confirm step naming who
leadership passes to — the earliest-joined remaining member.

### Wireframes

Screen 1 (not logged in):

```
┌ .team-page__container (max 760px) ──────────────┐
│ ← Back to WolfHacks                              │
│                                                   │
│  TEAM DASHBOARD                    (.eyebrow)    │
│  Find your team.               (.section__heading)│
│                                                   │
│  ┌ .team-card ─────────────────────────────────┐ │
│  │ Email                                        │ │
│  │ [ username@example.com               ]       │ │
│  │ [ Continue ]                (.btn--primary)  │ │
│  │ (inline message here if not-checked-in /     │ │
│  │  not-registered — .application-form__error)  │ │
│  └───────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

Screen 3 (no team, with an invite) — screen 2 is this minus the invites card:

```
┌ .team-page__container ───────────────────────────┐
│  YOUR TEAM                          (.eyebrow)    │
│  You're not on a team yet.      (.section__heading)│
│                                                   │
│  ┌ .team-card — "Pending invites" ──────────────┐ │
│  │ ┌ .team-invite ───────────────────────────┐  │ │
│  │ │ Wolfpack Coders · invited by A. Lee      │  │ │
│  │ │ 2/4 members      [Decline] [Accept]      │  │ │
│  │ │              (.btn--ghost)  (.btn--primary)│ │
│  │ └──────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌ .team-card — "Create a team" ─────────────────┐ │
│  │ Team name                                     │ │
│  │ [ ...                                 ]       │ │
│  │ [ Create team ]              (.btn--primary)  │ │
│  └───────────────────────────────────────────────┘ │
│  A leader can also add you by searching your      │
│  name or email.                    (.section__lede)│
└───────────────────────────────────────────────────┘
```

Screen 5 (leader view) — screen 4 is everything above the divider only:

```
┌ .team-page__container ───────────────────────────┐
│  YOUR TEAM                          (.eyebrow)    │
│  Wolfpack Coders          (.section__heading, Fraunces) │
│                                                   │
│  ┌ .team-card ───────────────────────────────────┐ │
│  │ Track:   [ AI/ML ]                (.team-chip)│ │
│  │ Challenges: [Best Use of API] [Best Design]   │ │
│  │                                                │ │
│  │ Members                          3/4 (.team-count)│
│  │ ┌ .team-member ─────────────────────────────┐ │ │
│  │ │ Sam Shah (you)  ·  LEADER   sam@ncsu.edu   │ │ │
│  │ ├────────────────────────────────────────────┤ │ │
│  │ │ A. Lee                     alee@ncsu.edu   │ │ │
│  │ └────────────────────────────────────────────┘ │ │
│  │                                                │ │
│  │ [ Leave team ]                (.btn--ghost)   │ │
│  └────────────────────────────────────────────────┘ │
│  ─────────────────── leader-only below ──────────  │
│  ┌ .team-card — "Track & challenges" ─────────────┐ │
│  │ [ SelectField: track ]                         │ │
│  │ [AI/ML] [Fintech] [Sustainability]  (chip toggle)│ │
│  └─────────────────────────────────────────────────┘ │
│  ┌ .team-card — "Invite teammates" ───────────────┐ │
│  │ [ search name or email...            ]         │ │
│  │  ┌ .application-form__dropdown ──────────────┐ │ │
│  │  │ J. Kim · jkim@ncsu.edu        [Invite]     │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌ .team-card — "Sent invites" ───────────────────┐ │
│  │ M. Patel — pending           [Cancel]          │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

### Component tree

```
TeamDashboard                     (TD-08, owns which-of-5-screens state)
├─ PortalLogin                    (TD-07 — screen 1)
├─ PendingInvites  (mode="incoming")  (TD-12 — screen 3, above create)
├─ TeamCreateCard                 (TD-10 — screens 2/3)
└─ TeamOverview                   (TD-09 — screens 4/5)
   ├─ (member list + leave, always)
   ├─ TrackChallengePicker        (TD-13 — leader only)
   ├─ InviteSearch                (TD-11 — leader only)
   └─ PendingInvites (mode="outgoing") (TD-12 — leader only, "Sent invites")
```

`PendingInvites` is one component with an `incoming`/`outgoing` mode rather
than two — same row shape, different actions (Accept/Decline vs. Cancel).

### States every action needs
Following the conventions already in `ApplyPage.jsx`: string status enums
(`'idle' | 'submitting' | 'error'`), a form-level error channel plus per-field
errors, buttons disabled while submitting with a label swap, backend detail
logged to `console.error` and never shown raw to the user.

---

## Tickets

Ordered. Each is small enough to finish and review in one sitting.
`[blocked]` marks the only ones that need someone else first.

### Phase 1 — Shared groundwork (no design decisions, pure plumbing)

**TD-01 · API client**
Create `src/lib/api.js`. Move the `API_URL` constant out of
`ApplyPage.jsx:6` (`import.meta.env.VITE_API_URL ?? (DEV ? 'http://localhost:8000' : '')`);
add `apiFetch(path, opts)` that attaches `Authorization: Bearer <token>`,
JSON-encodes bodies, and throws a typed `ApiError` on non-2xx; add
`getSessionToken`/`setSessionToken` wrapping `localStorage` in try/catch.
Update `ApplyPage.jsx` to import `API_URL` from it.
*Done when:* apply form still submits correctly; no duplicated API_URL.

**TD-02 · Extract SelectField**
Move the unexported `SelectField` (`ApplyPage.jsx:176-229`) to
`src/components/SelectField.jsx`. Move its injected `dropdownStyles` string
(`ApplyPage.jsx:122-174`, plus the `useEffect` that appends a `<style>` tag)
into `index.css`, swapping its undefined fallback vars
(`--color-bg`, `--color-border`, `--color-primary`) for real tokens
(`--ink-raised`, `--line`, `--red`).
*Done when:* every dropdown on `/apply` looks and behaves identically in both
themes, and no `<style>` tag is injected at runtime.

**TD-03 · `/team` route**
Add a `/team` branch to `src/App.jsx` beside `/apply` and `/thank-you`,
rendering a placeholder that includes `<Starfield />` and `<ThemeToggle />`
like the other route branches do. No `vercel.json` change needed — the SPA
rewrite already covers it.
*Done when:* `/team` deep-links without a 404 in `npm run dev`.

**TD-04 · Tracks & challenges config**
Add `event.tracks` and `event.challenges` to `src/data/siteConfig.js` as
arrays of `{ slug, name, description }`, mirroring the `faq.items` shape.
Placeholder content — the real list doesn't exist yet (question out to Cooper).
*Done when:* both arrays exist and are importable.

**TD-05 · Fix git remote**
`origin` is SSH while `gh` is authenticated over HTTPS, so `git fetch` fails.
Point it at `https://github.com/ACM-NCSU/WolfHacks-Day-Of-Portal.git`.
*(Already applied this session.)*

### Phase 2 — Dashboard UI on mock data

Design is worked out directly in code against the existing token system, then
reviewed live in the browser (agreed approach — no separate mockup step).

**TD-06 · Mock fixtures**
`src/data/mockTeamState.js` — one exported fixture per dashboard state so
every component below can be built and reviewed before any backend exists:
no team / has pending invites / on a team as member / on a team as leader.
*Done when:* switching the fixture switches what `/team` renders.

**TD-07 · Session hook + stub login**
`src/hooks/useSession.js` (token in localStorage; `{ participant, status,
login(email), logout() }`) and `src/components/PortalLogin.jsx` — email only,
no password. Must render #5's three outcomes so the real login can reuse the
copy: checked in / registered but not checked in / not registered.
*Done when:* the three states render from mock data; token persists a reload.

**TD-08 · Dashboard shell**
`src/components/TeamDashboard.jsx` — routes between the four states, renders
page chrome. Base `.team-dashboard__*` BEM styles in `index.css` using only
existing tokens (`--ink-raised`, `--line`, `--card`, `--red`, `--font-mono`
for labels) so light mode works for free. Use `var(--red)` for errors, not the
hardcoded `#ff8b8b` the apply form uses.
*Done when:* all four mock states render and light/dark both look right.

**TD-09 · Team overview**
`TeamOverview.jsx` — team name, track, challenges, member list with a leader
badge, and the leave button. This is the issue's "all info a team would need."
*Done when:* renders from a mock team; leave button present (no-op for now).

**TD-10 · Create team**
`TeamCreateCard.jsx` — name input + submit, with a taken-name error state.
Follow the existing form conventions: string status enums
(`'idle' | 'submitting' | 'error'`), per-field + form-level error channels.
*Done when:* validation and error states render from mock responses.

**TD-11 · Invite search**
`InviteSearch.jsx` — leader-only. Search checked-in hackers by name/email,
exclude anyone already on a team, disable at 4 members. Closest prior art is
the country/university combobox in `ApplyPage.jsx` (inlined and duplicated
there — build this as a proper component instead).
*Done when:* searching mock participants filters and an invite can be sent.

**TD-12 · Pending invites**
`PendingInvites.jsx` — incoming invites with accept/decline; leader also sees
outgoing invites with cancel.
*Done when:* both directions render and act on mock data.

**TD-13 · Track & challenge picker**
`TrackChallengePicker.jsx` — leader-only, reads `siteConfig`, one track +
many challenges. Reuses `SelectField` from TD-02.
*Done when:* selections render and persist into mock state.

### Phase 3 — Backend (in-memory persistence, no Supabase required)

**Restructured after starting Phase 3**: rather than each endpoint needing
live Supabase credentials to even test, the backend gets its own in-memory
repository -- the same seam pattern as the frontend's `mockTeamState.js`, and
consistent with how the auth stub is already isolated for #5 to swap later.
This lets the *entire* request/response contract (routes, validation, the
one-team-at-a-time / max-4 / leadership-transfer rules, real HTTP calls
between Vite and uvicorn) get built and tested now. Phase 4 becomes "swap the
repository's internals for Supabase queries," not "write the backend for the
first time against a live database."

**TD-14 · In-memory repository**
`backend/repository.py` — module-level store (participants / teams / invites,
seeded with the same six mock accounts as `src/data/mockTeamState.js` so
manual testing lines up across frontend and backend) behind plain functions:
`get_participant_by_email`, `get_team_for_participant`, `create_team`,
`invite_participant`, `accept_invite`, `leave_team`, etc. This file is the
**only** thing TD-21 rewrites — `teams.py` and `auth_stub.py` call these
functions and never touch persistence directly.
*Done when:* importable and unit-testable with no `SUPABASE_*` env vars set.

**TD-15 · Stub auth**
`backend/auth_stub.py`, clearly marked temporary and owned by #5.
`POST /api/auth/login` takes `{email}`, looks up the repository's
participants, rejects unless `checked_in`, returns an HMAC-signed token
(`itsdangerous`) carrying `participant_id`. Exports the
`get_current_participant` dependency. No passwords stored — nothing for Bela
to migrate away from.
*Done when:* login returns a token for a checked-in seed user and 403s for a
not-checked-in one; `GET /api/auth/me` round-trips.

**TD-16 · Read endpoints**
`backend/teams.py` (an `APIRouter`, included from `main.py`):
`GET /api/team/me` (team + members + track + challenges + both invite
directions in one round trip) and `GET /api/participants/search?q=`
(checked-in, not already on a team).
*Done when:* both return correct shapes for a seeded team, via curl against
`uvicorn` with no database configured.

**TD-17 · Team lifecycle**
`POST /api/teams` (creator becomes leader **and** a member),
`PATCH /api/teams/{id}` (leader only: name, `track_slug`, challenge slugs —
validated against the siteConfig list mirrored server-side, in the
`Literal[...]` style `main.py` already uses),
`DELETE /api/teams/{id}/members/me` (leave — **if leader, transfer to the
earliest-joined remaining member; delete the team if they were the last**).
*Done when:* leader transfer and last-member deletion both verified by curl.

**TD-18 · Invite endpoints**
`POST /api/teams/{id}/invites` (leader only),
`DELETE /api/teams/{id}/invites/{invite_id}` (rescind),
`POST /api/invites/{id}/accept` (409 if already on a team or team is full;
cancels the accepter's other pending invites),
`POST /api/invites/{id}/decline`.
Plus a `notify_invite()` seam that just logs — the hook #2's owner can wire to
a real channel later.
*Done when:* the full invite lifecycle works via curl.

**TD-19 · Config & docs**
`WOLFHACKS_SESSION_SECRET` in `backend/.env.example`; `itsdangerous` in
`requirements.txt`; document the new endpoints in `backend/README.md`; note
that persistence is in-memory until TD-21.

### Phase 3.5 — Wire frontend to the real backend (still no Supabase)

Added after Phase 3 shipped: the backend now works standalone against its
own in-memory repository, so there's no reason to leave the frontend talking
to a *second*, disconnected mock (`src/data/mockTeamState.js`). Doing this
now means Phase 4 is purely a database swap, not also the first time the two
halves of the stack actually talk to each other.

**TD-19b · Point the frontend at the real API**
Replace the `mockLogin`/`mockGetMyState`/etc. calls in `src/hooks/useSession.js`,
`src/hooks/useTeamState.js`, and all Phase 2 components with `apiFetch` calls
to the endpoints built in TD-15..18. `src/data/mockTeamState.js` and its
`LoginError`/`MockApiError` classes can be deleted once nothing imports them.
Requires running `uvicorn` locally alongside `npm run dev` (`VITE_API_URL`
already defaults to `http://localhost:8000` in dev, per `src/lib/api.js`).
*Done when:* the same manual walkthrough from "How to test Phase 2" passes
against the real backend instead of the JS mock, including a full page
reload preserving the session (the stub token in `localStorage`).

### Phase 4 — Database & realtime

**TD-20 · Agree the shared table** `[blocked: Arjun #1, Bela #5]`
Post the `participants` DDL (below) on #1/#4/#5 and get sign-off before it
goes into Supabase. Everything else in Phase 4 waits on this.

**TD-21 · Apply schema & swap the repository**
Run the DDL below in the Supabase SQL editor; append it to
`backend/supabase_schema.sql` (the repo's existing hand-migration convention).
Rewrite `backend/repository.py`'s internals to query Supabase instead of the
in-memory store -- same function signatures, so `teams.py`/`auth_stub.py`
don't change.

**TD-22 · Dev seed script**
Copy N rows from `applications` into `participants` with `checked_in = true`
so the feature is testable before #1 exists. Dedupe on `lower(email)` —
`applications` has no unique email constraint.

**TD-23 · Realtime wiring**
By this point `useTeamState.js` already calls the real API (TD-19b) — this
ticket only adds live updates on top. Add `@supabase/supabase-js`;
`src/lib/supabase.js` anon client (`VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY`); subscribe to `postgres_changes` on the three team
tables and call `refresh()` on any event. **Never read the payload — always
re-fetch from FastAPI.**
*Done when:* an invite sent in one browser profile appears in another without
a refresh.

**TD-24 · Update tracking docs**
Sync `CLAUDE.md` with what actually shipped and the #1/#5 coordination outcome.

---

## Reference: schema

### Shared identity table (TD-20 — needs sign-off)

```sql
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id),
  auth_user_id uuid,                        -- reserved for #5; unused for now
  email text not null,
  full_name text not null,
  discord_username text not null default '',
  role text not null default 'hacker' check (role in ('hacker', 'organizer')),
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists participants_email_key
  on participants (lower(email));
```

Deliberately **not** FK'd to `auth.users` — that would commit the portal to
Supabase Auth, which is #5's call. `auth_user_id` is reserved so they can
adopt it later without a rewrite.

### Team tables (mine)

```sql
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_id uuid not null references participants(id),
  track_slug text,                          -- validated in the backend against siteConfig
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists teams_name_key on teams (lower(name));

create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, participant_id)
);
-- "one team at a time", enforced by the database rather than by code
create unique index if not exists team_members_one_team
  on team_members (participant_id);

create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  invited_participant_id uuid not null references participants(id) on delete cascade,
  invited_by uuid not null references participants(id),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
-- no duplicate outstanding invites to the same person from the same team
create unique index if not exists team_invites_one_pending
  on team_invites (team_id, invited_participant_id) where status = 'pending';
create index if not exists team_invites_invitee_idx
  on team_invites (invited_participant_id) where status = 'pending';

create table if not exists team_challenges (
  team_id uuid not null references teams(id) on delete cascade,
  challenge_slug text not null,
  primary key (team_id, challenge_slug)
);
```

### Max size 4

The row lock is what makes this correct under two simultaneous accepts —
without it both transactions read a count of 3 and both insert.

```sql
create or replace function enforce_team_size() returns trigger as $$
declare
  member_count integer;
begin
  perform 1 from teams where id = new.team_id for update;   -- serialize concurrent joins
  select count(*) into member_count from team_members where team_id = new.team_id;
  if member_count >= 4 then
    raise exception 'Team is already full (max 4 members)'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger team_members_max_size
  before insert on team_members
  for each row execute function enforce_team_size();
```

The backend also checks size before accepting, purely for a friendly message;
the trigger is the actual guarantee.

### RLS & Realtime

Backend keeps using the service-role key (bypasses RLS), matching
`write_to_supabase()` in `main.py`. Because we are **not** on Supabase Auth,
RLS can't identify the browser — so realtime is only a "something changed"
ping and the three exposed tables carry **uuids and a team name only, no PII**.
All PII stays in `participants`, which gets no anon policy.

```sql
alter table participants    enable row level security;
alter table teams           enable row level security;
alter table team_members    enable row level security;
alter table team_invites    enable row level security;
alter table team_challenges enable row level security;

create policy realtime_read_teams   on teams        for select to anon using (true);
create policy realtime_read_members on team_members for select to anon using (true);
create policy realtime_read_invites on team_invites for select to anon using (true);
-- participants intentionally has NO anon policy

alter publication supabase_realtime add table teams, team_members, team_invites;
```

Fallback if that exposure is judged too loose: poll `GET /api/team/me` every
10s and drop the anon client — a one-hook change in TD-23.

---

## Reference: decisions taken

| Question | Decision |
|---|---|
| Identity before #5 ships | Stub auth, email-only, no password, behind `get_current_participant` |
| Who can be invited | New `participants` table, checked-in only |
| Invite mechanism | **In-app search** over checked-in hackers — not an outbound email invite |
| Tracks/challenges source | Hardcoded config in `siteConfig.js`, slugs in the DB |
| Track/challenge shape | One track, many challenges |
| Max team size | 4 |
| Leader leaves | Auto-transfer to earliest-joined member; delete team if last |
| Live updates | Supabase Realtime as a ping; always re-fetch from FastAPI |
| Invite notification | In-app only for v1 (a webhook can't DM; no email provider configured) |
| Design process | Directly in code on existing tokens, reviewed live in browser |
| Backend persistence, Phase 3 | In-memory repository (`backend/repository.py`), same seam as the frontend mock; swapped for Supabase queries in TD-21. No Supabase credentials needed until then. |

---

## Open questions for the team

None block Phase 1, 2 or 3. Only TD-20 (and therefore Phase 4) is blocked.

**Cooper** — tracks vs. sponsor challenges, and how many of each per team; can
a hacker stay team-less; is organizer team admin in scope (I've assumed not);
does team composition lock before judging.

**Arjun (#1)** — does the `participants` shape work for check-in; how should
seeding dedupe `applications` (no unique email constraint today); is there a
waitlist state beyond boolean `checked_in`.

**Bela (#5)** — Supabase Auth or custom; does the organizer whitelist reuse
`participants.role`; confirm the `get_current_participant` swap contract;
please store the Discord **snowflake ID**, not just the username.

**Sarthak (#3)** — want to share `src/lib/api.js`, `src/lib/supabase.js` and
the portal routing; are you using Realtime too.

**#2 owner** — is there an actual Discord bot (vs. only a webhook), and any
email provider, for invite notifications later.

---

## How to test Phase 2 (mock data)

`npm run dev`, open `/team`. `src/data/mockTeamState.js` seeds these accounts
(any password-free "login" is just typing the email):

| Email | State |
|---|---|
| `sam@ncsu.edu` | checked in, no team — screen 2 |
| `alex@ncsu.edu` | checked in, has a pending invite to "Wolfpack Coders" — screen 3 |
| `taylor@ncsu.edu` | checked in, member of "Wolfpack Coders" — screen 4 |
| `jordan@ncsu.edu` | checked in, leader of "Wolfpack Coders" — screen 5 |
| `morgan@ncsu.edu` | checked in, no team (a search/invite target for the leader) |
| `casey@ncsu.edu` | registered but **not** checked in — tests login outcome 2 |
| anything else | not registered at all — tests login outcome 3 |

Suggested walkthrough: log in as `jordan`, invite `sam` via search, log out, log
in as `sam`, accept the invite, confirm the roster now shows 3 members, log
back in as `jordan` and set a track/challenge, then leave as `jordan` and
confirm leadership transfers to `taylor` (earliest-joined remaining member).
State resets on a full page reload (it's in-memory, not persisted).

---

## Verification

1. **Constraints** (SQL editor — fastest place to prove the invariants):
   second `team_members` row for one participant → unique violation; 5th
   member → `Team is already full`; duplicate pending invite → unique
   violation; `'Wolfpack'` + `'wolfpack'` → unique violation.
2. **Backend**: `cd backend && uvicorn main:app --reload --port 8000`, then
   walk create → invite → accept → leave with curl.
3. **End to end**: `npm run dev`, `/team` in two browser profiles as two
   seeded hackers. Create team → invite → **appears without a refresh** →
   accept → both see the roster → leader leaves → leadership transfers → last
   member leaves → team disappears.
4. **Edge cases**: accept while already on a team; invite someone already on a
   team; invite a 5th; duplicate team name; non-leader calling `PATCH`.
5. **Light mode**: toggle the theme on `/team` — nothing hardcoded should survive.
6. **No regressions**: `/apply` still submits (TD-01/TD-02 touched it).
