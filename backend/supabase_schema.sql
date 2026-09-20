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
