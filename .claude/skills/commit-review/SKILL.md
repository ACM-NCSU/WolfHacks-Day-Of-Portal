---
name: commit-review
description: How to review a diff and write a commit message for this repo -- self-review checklist before staging, a ticket-referenced Conventional Commits format, and worked examples from this project's TD-01..TD-24 ticket plan. Load before running `git commit` in this repo, or whenever asked to "commit properly", "write a good commit message", or "review before committing".
---

# Commit review & message quality

Five people are pushing to this repo in parallel (issues #1-#5), and work here
is tracked as numbered tickets (TD-01..TD-24 in `plan.md`) rather than one big
feature branch. The goal of a good commit here is narrow and practical:
**someone reading `git log --oneline` six months from now, or a teammate
checking what part of issue #4 is actually done, should not have to open the
diff to find out.** That means every commit names which ticket(s) it covers
and says *why*, not just what changed (the diff already shows what).

Sources this is grounded in: Chris Beams, ["How to Write a Git Commit
Message"](https://cbea.ms/git-commit/) (the seven rules below), and the
[Conventional Commits spec](https://www.conventionalcommits.org/en/v1.0.0/)
(the `type(scope): summary` line and type vocabulary).

## Step 1 — review before staging, every time

Do this whether the change is one file or twelve:

1. `git status` -- confirm nothing unexpected is untracked or modified. If a
   broad edit touched more than intended, check `git diff --stat` before
   staging.
2. `git diff` (or per-file) -- read your own change once as if reviewing
   someone else's PR. Look specifically for: leftover `console.log`/debug
   code that isn't the project's established error-logging pattern (see
   `ApplyPage.jsx`'s `console.error` + generic user message convention),
   commented-out code, secrets or `.env` values, and anything unrelated to
   the ticket that snuck in.
3. Stage specific files (`git add <path>...`), never a blanket `git add -A`
   or `git add .` -- this repo has `backend/.env` patterns and service-account
   JSON that must never be committed.
4. If the change touched frontend code, confirm `npm run build` is clean
   first. If it touched backend code, confirm the server still imports/boots.
5. For anything larger than a small fix -- a full ticket or several -- run
   `/code-review` (or `/simplify` for a pure cleanup pass) before committing.
   For a small, obviously-correct change, the read-through in step 2 is enough;
   don't invoke a full multi-agent review for a one-line fix.

## Step 2 — the commit message

### Subject line

```
type(scope): summary
```

- **type** -- one of: `feat` (new capability), `fix` (bug fix), `refactor`
  (no behavior change), `chore` (tooling/config/deps), `docs` (plan.md,
  CLAUDE.md, README), `style` (CSS/visual only, no logic change).
- **scope** -- the ticket area, e.g. `team-dashboard`, `apply-form`, `api`.
  Keep it short and consistent across commits touching the same area.
- **summary** -- imperative mood ("add", not "added"/"adds"), capitalized
  first word, **no trailing period**, aim for 50 characters and hard-wrap at
  72. "Imperative" is the test Beams gives: it should complete the sentence
  "If applied, this commit will ___."

### Body

- Blank line after the subject (required -- this is what lets `git log
  --oneline` and tools treat the subject as a subject).
- Wrap prose at ~72 characters.
- Explain **why**, not what -- the diff already shows what. Say what problem
  this solves, what tradeoff was made, or what it unblocks. ("Extracted
  SelectField into its own file so the team dashboard's track picker can
  reuse it" beats "Move SelectField to a new file.")
- Name every ticket the commit covers, e.g. `Covers TD-01, TD-02.` This is
  the single most useful line for coming back later -- it's how you or a
  teammate map `git log` back to `plan.md`.
- If the commit intentionally leaves something out of scope or defers a
  decision, say so in one line (mirrors how plan.md flags open questions) --
  e.g. `Backend still mocked in-memory; Supabase wiring is TD-20+.`

### Footer

- `Refs #4` (not `Closes #4`) while the issue is still in progress -- this
  repo's features ship incrementally across many commits, and `Closes` on an
  early commit would auto-close the issue on merge before the work is done.
- Claude Code sessions are given an explicit attribution footer to append
  (a `Co-Authored-By:` line, sometimes a session link) via a system
  instruction at the start of the conversation -- this is **not** automatic,
  it must be typed into the message like any other footer. Check the current
  session's instructions for the exact text before writing it from memory.

### Worked examples from this project

A commit covering the Phase 1 groundwork tickets:

```
feat(team-dashboard): scaffold shared API client and route (TD-01..TD-04)

Centralizes the API_URL constant that ApplyPage previously declared on
its own, so the team dashboard (and eventually the schedule, #3) has one
place to add auth headers later. Extracts SelectField out of ApplyPage
into its own component and moves its injected <style> tag into
index.css on real tokens, since the track picker needs the same
dropdown. Adds the /team route (still a placeholder) and placeholder
tracks/challenges config -- real list is an open question for Cooper.

Covers TD-01, TD-02, TD-03, TD-04, TD-05.
Refs #4.
```

A commit covering the Phase 2 UI-on-mock-data tickets:

```
feat(team-dashboard): build /team against a mock backend (TD-06..TD-13)

Full create/invite/accept/decline/leave flow, working end to end, but
backed by src/data/mockTeamState.js instead of the real API -- there's
no Supabase schema yet (blocked on TD-20, needs Arjun/Bela sign-off) and
no login (issue #5, Bela). Mock function names and shapes mirror the
planned FastAPI endpoints on purpose, so swapping a component from mock
calls to apiFetch later is a one-line change per call site, not a
rewrite.

Six seeded mock accounts cover every dashboard state and both login
failure modes -- see plan.md "How to test Phase 2" for the list.

Covers TD-06 through TD-13.
Refs #4.
```

A small fix, no ticket:

```
fix(apply-form): use var(--red) for the honeypot field error

The hardcoded #ff8b8b only reads correctly in dark mode; it disappears
against light mode's card background.
```

## What NOT to do

- Don't write `wip` or `stuff` commits -- if the change isn't at a
  reviewable, buildable checkpoint, it isn't ready to commit yet.
- Don't squash unrelated tickets into one commit just because they were
  built in the same sitting -- separate commits per logical unit (roughly:
  per phase, or per ticket if a ticket was large) keep `git log` useful as a
  changelog. It's fine for one commit to cover several small tickets that
  landed together (see the worked examples above); it's not fine to mix,
  say, a CSS fix with a new backend endpoint.
- Don't describe the diff mechanically line-by-line in the body -- if you're
  restating "changed X to Y" for every file, you're writing what the diff
  already says instead of why it matters.
