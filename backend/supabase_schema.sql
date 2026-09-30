-- Run this in the Supabase SQL editor to create the applications table.
-- Column names match the Application pydantic model in main.py 1:1 so
-- write_to_supabase() can insert model_dump() straight through.

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  first_name text not null,
  middle_name text default '',
  last_name text not null,
  age integer not null,
  email text not null,
  country_of_residence text not null,
  discord_username text not null,
  linkedin_url text default '',
  phone_number text not null,
  classification text not null,
  university text default '',
  major text default '',
  major_other text default '',
  hackathon_participation text default '',
  gender text default '',
  gender_other text default '',
  pronouns text default '',
  pronouns_other text default '',
  dietary_notes text default '',
  dietary_notes_other text default '',
  mlh_code_of_conduct boolean not null,
  mlh_data_authorization boolean not null,
  mlh_marketing_emails boolean not null default false
);

-- RLS stays on by default; the backend writes with the service role key,
-- which bypasses RLS, so no policy is required for inserts to work.
alter table applications enable row level security;

-- We stopped collecting shirt size; drop the columns if this script is
-- being re-run against a table created before that change.
alter table applications drop column if exists shirt_size;
alter table applications drop column if exists shirt_size_other;

-- We now ask applicants whether they're currently enrolled before showing
-- university/classification/major; backfill existing rows from whether they
-- already have a university on file, then enforce not-null going forward.
alter table applications add column if not exists currently_enrolled text;
update applications
  set currently_enrolled = case when coalesce(university, '') <> '' then 'Yes' else 'No' end
  where currently_enrolled is null;
alter table applications alter column currently_enrolled set not null;

-- Dietary restrictions, gender, and hackathon-participation are now optional
-- on the form; relax the not-null constraints and default new rows to ''.
alter table applications alter column hackathon_participation drop not null;
alter table applications alter column hackathon_participation set default '';
alter table applications alter column gender drop not null;
alter table applications alter column gender set default '';
alter table applications alter column dietary_notes drop not null;
alter table applications alter column dietary_notes set default '';

-- Replaced the enrolled Yes/No question with a required "Level of Study"
-- question, reusing the classification column for it. Backfill any historical
-- empty values before enforcing not-null so the migration doesn't fail on
-- pre-existing rows.
alter table applications drop column if exists currently_enrolled;
update applications set classification = 'Prefer not to answer' where coalesce(classification, '') = '';
alter table applications alter column classification set not null;
alter table applications alter column classification drop default;

-- Major is now a fixed dropdown (with an "Other (please specify)" free-text
-- companion column) instead of free text, and stays optional. Also added an
-- optional LinkedIn URL field for connecting applicants with sponsors.
alter table applications add column if not exists major_other text default '';
alter table applications add column if not exists linkedin_url text default '';

-- Portal login (feature/log-in-flow): links an applications row to its
-- Supabase auth user, backfills the Discord identity used to sign in, and
-- assigns a role for the portal's hacker/organizer/admin gating. main.py's
-- get_and_backfill_user() reads/writes user_id and discord_id; auth_me()
-- reads role. New applicants default to 'hacker'; promote organizers/admins
-- by hand in the table editor.
alter table applications add column if not exists user_id uuid references auth.users(id);
alter table applications add column if not exists discord_id text;
alter table applications add column if not exists role text not null default 'hacker';
create unique index if not exists applications_user_id_key on applications(user_id) where user_id is not null;
create unique index if not exists applications_discord_id_key on applications(discord_id) where discord_id is not null;

-- Day-of check-in (feature/event-check-in): staff mark a registrant
-- checked_in at the event. auth.get_current_participant() enforces this as
-- the portal login gate -- hackers must be checked in, organizers/admins
-- are exempt. checked_in_at is left null until check-in happens.
alter table applications add column if not exists checked_in boolean not null default false;
alter table applications add column if not exists checked_in_at timestamptz;

-- Case-insensitive email is the primary lookup path for check-in search.
create index if not exists applications_email_lower_idx on applications (lower(email));

-- Meal check-in (backend/meals.py): one boolean per real meal slot on the
-- schedule (see repository.py's _seed_schedule), set the first time an
-- organizer scans that hacker's QR code for that meal and never unset --
-- scanning again is rejected as already-scanned rather than toggling it.
alter table applications add column if not exists meal_lunch_day1 boolean not null default false;
alter table applications add column if not exists meal_dinner_day1 boolean not null default false;
alter table applications add column if not exists meal_breakfast_day2 boolean not null default false;
alter table applications add column if not exists meal_lunch_day2 boolean not null default false;

-- Announcements (backend/announcements.py): organizer broadcasts shown on
-- the portal's Announcements tab and as a site-wide banner. Previously a
-- plain in-memory list in repository.py, which silently lost or "flickered"
-- announcements in production -- this backend deploys to Vercel as a
-- serverless function, so different requests can land on different
-- processes (or a freshly cold-started one) with no memory shared between
-- them. author_name is captured at creation time rather than joined from
-- applications, so it survives even if that application row is later
-- removed, and reads never depend on any in-memory cache.
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  author_id uuid not null references applications(id),
  author_name text not null,
  created_at timestamptz not null default now()
);
create index if not exists announcements_created_at_idx on announcements (created_at desc);

alter table announcements enable row level security;
-- Zero policies, on purpose, matching the teams tables: only the
-- service-role key (which bypasses RLS) reads or writes this table. The
-- portal reads announcements through the FastAPI backend, not directly via
-- Supabase, so no anon SELECT policy is needed.

-- Schedule (backend/schedule.py): the day-of agenda, editable by organizers
-- when something runs long or moves. Same in-memory-on-serverless problem
-- as announcements had, and the same fix. id stays a short text slug
-- ("s-1", ...) rather than a uuid, matching the values repository.py used
-- to hardcode, so this seed is a straightforward one-time copy of them.
create table if not exists schedule_items (
  id text primary key,
  title text not null,
  location text,
  start_time timestamptz not null,
  end_time timestamptz not null
);

alter table schedule_items enable row level security;
-- Zero policies -- same posture as announcements/teams above.

-- One-time seed of the real WolfHacks 2026 schedule (Oct 3-4, matching
-- siteConfig.js's event.date/countdownTarget), in the event's local time
-- (America/New_York, UTC-4 under DST, which is in effect those dates).
-- `on conflict do nothing` makes this safe to re-run without clobbering any
-- edits organizers have since made through the portal.
insert into schedule_items (id, title, location, start_time, end_time) values
  ('s-1', 'Check-In', null, '2026-10-03 09:00:00-04', '2026-10-03 10:00:00-04'),
  ('s-2', 'Sponsorship Fair', null, '2026-10-03 09:00:00-04', '2026-10-03 10:00:00-04'),
  ('s-3', 'Opening Ceremony', null, '2026-10-03 10:00:00-04', '2026-10-03 10:30:00-04'),
  ('s-4', 'Team Formation', null, '2026-10-03 10:30:00-04', '2026-10-03 11:00:00-04'),
  ('s-5', 'Competition Begins', null, '2026-10-03 11:00:00-04', '2026-10-03 11:15:00-04'),
  ('s-6', 'Lunch', null, '2026-10-03 12:00:00-04', '2026-10-03 13:00:00-04'),
  ('s-7', 'Mentor Check-In', null, '2026-10-03 14:00:00-04', '2026-10-03 15:30:00-04'),
  ('s-8', 'Dinner', null, '2026-10-03 18:00:00-04', '2026-10-03 19:00:00-04'),
  ('s-9', 'Breakfast', null, '2026-10-04 09:00:00-04', '2026-10-04 10:00:00-04'),
  ('s-10', 'Project Submissions Due', null, '2026-10-04 11:00:00-04', '2026-10-04 11:15:00-04'),
  ('s-11', 'Lunch', null, '2026-10-04 11:30:00-04', '2026-10-04 12:30:00-04'),
  ('s-12', 'Judging', null, '2026-10-04 12:30:00-04', '2026-10-04 14:30:00-04'),
  ('s-13', 'Closing Ceremony', null, '2026-10-04 15:00:00-04', '2026-10-04 15:30:00-04'),
  ('s-14', 'Event Ends', null, '2026-10-04 16:00:00-04', '2026-10-04 16:15:00-04')
on conflict (id) do nothing;
