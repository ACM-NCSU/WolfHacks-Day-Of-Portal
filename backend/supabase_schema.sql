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

-- Admission decision: whether this applicant was accepted into the event.
-- Defaults to false since most registrations are not accepted (only ~278
-- of the much larger applicant pool); organizers flip this to true for
-- accepted applicants via the Supabase table editor (or a bulk update from
-- the accepted-applicant list), separately from check-in. Surfaced
-- read-only on the day-of check-in tab so staff can see a rejected
-- applicant showed up without being blocked from checking them in.
alter table applications add column if not exists accepted boolean not null default false;

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

-- Team dashboard (issue #4): previously staged in supabase_dev_bootstrap.sql
-- (marked "never run against the shared production project" because this
-- hadn't been reviewed into the real schema yet) and never actually applied
-- here -- which is why GET /api/team/me 500s in production: the tables
-- below don't exist there. Folding it into the real schema now; the dev
-- bootstrap script is retired (see its own comment) now that every part of
-- it lives here.

-- Read-only identity view: gives teams.py full_name without adding a column
-- to applications. security_invoker means the view runs with the CALLER's
-- privileges, not its owner's -- required so applications' RLS actually
-- applies through the view instead of being bypassed by it.
create or replace view participant_directory as
select
  a.id,
  a.email,
  lower(btrim(a.email)) as email_lower,
  btrim(regexp_replace(
    concat_ws(' ',
      nullif(btrim(a.first_name), ''),
      nullif(btrim(a.middle_name), ''),
      nullif(btrim(a.last_name), '')
    ),
    '\s+', ' ', 'g'
  )) as full_name,
  a.checked_in,
  a.role,
  a.submitted_at
from applications a;

-- Requires Postgres 15+ (any recent Supabase project qualifies). If this
-- errors on an older project, drop it -- the REVOKE below is what actually
-- closes the anon-read hole; the backend's service-role key bypasses RLS
-- regardless of this setting.
alter view participant_directory set (security_invoker = on);

-- Team tables. Every identity FK points at applications(id) -- there is no
-- separate participants table.
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_id uuid not null references applications(id),
  track_slug text,
  challenge_slugs text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists teams_name_key on teams (lower(name));

create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  participant_id uuid not null references applications(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, participant_id)
);
-- "one team at a time", enforced by Postgres rather than by application code
create unique index if not exists team_members_one_team on team_members (participant_id);
create index if not exists team_members_team_idx on team_members (team_id, joined_at);

create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  invited_participant_id uuid not null references applications(id) on delete cascade,
  invited_by uuid not null references applications(id),
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

alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invites enable row level security;
-- Zero policies, on purpose: only the service-role key (which bypasses RLS)
-- reads or writes these tables, matching the rest of the backend.

-- Functions. These raise MACHINE-readable codes (via errcode/message) that
-- backend/repository.py translates into the exact user-facing strings
-- teams.py returns. No UI copy belongs in this file.

-- Serializes concurrent joins so two simultaneous accepts can't both see a
-- count of 3 and both insert into a team that's actually already full.
create or replace function enforce_team_size() returns trigger
language plpgsql as $$
declare
  member_count integer;
begin
  perform 1 from teams where id = new.team_id for update;
  select count(*) into member_count from team_members where team_id = new.team_id;
  if member_count >= 4 then
    raise exception 'team_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists team_members_max_size on team_members;
create trigger team_members_max_size
  before insert on team_members
  for each row execute function enforce_team_size();

-- Accepting an invite is four writes (mark accepted, add member, cancel the
-- accepter's other pending invites, touch the team). Run as one function so
-- a partial failure can't strand the invite as "accepted" with no matching
-- membership, or leave someone holding live invites while already on a team.
create or replace function accept_team_invite(p_invite_id uuid, p_participant_id uuid)
returns uuid
language plpgsql as $$
declare
  v_team uuid;
begin
  select team_id into v_team from team_invites
    where id = p_invite_id
      and invited_participant_id = p_participant_id
      and status = 'pending'
    for update; -- blocks a second concurrent accept of the same invite

  if not found then
    raise exception 'invite_unavailable' using errcode = 'P0001';
  end if;

  perform 1 from teams where id = v_team for update;
  if not found then
    raise exception 'team_gone' using errcode = 'P0001';
  end if;

  -- team_members_one_team (already on a team) and the enforce_team_size
  -- trigger (team full) both surface as ordinary constraint/exception
  -- errors from this insert -- repository.py maps them the same as any
  -- other write.
  insert into team_members (team_id, participant_id) values (v_team, p_participant_id);

  update team_invites set status = 'accepted', responded_at = now()
    where id = p_invite_id;

  update team_invites set status = 'cancelled', responded_at = now()
    where invited_participant_id = p_participant_id
      and status = 'pending'
      and id <> p_invite_id;

  update teams set updated_at = now() where id = v_team;

  return v_team;
end;
$$;

-- Leaving a team is up to three writes (remove member, maybe transfer
-- leadership, maybe delete the team). Run as one function so a crash
-- mid-sequence can't leave leader_id pointing at someone no longer on the
-- team -- a state with no recovery screen in the UI.
create or replace function leave_team_tx(p_team_id uuid, p_participant_id uuid)
returns boolean -- true when the team was deleted (last member left)
language plpgsql as $$
declare
  v_leader uuid;
  v_next uuid;
begin
  select leader_id into v_leader from teams where id = p_team_id for update;
  if not found then
    raise exception 'team_not_found' using errcode = 'P0001';
  end if;

  delete from team_members where team_id = p_team_id and participant_id = p_participant_id;
  if not found then
    raise exception 'not_on_team' using errcode = 'P0001';
  end if;

  select participant_id into v_next from team_members
    where team_id = p_team_id
    order by joined_at, participant_id
    limit 1;

  if v_next is null then
    delete from teams where id = p_team_id;
    return true;
  end if;

  if v_leader = p_participant_id then
    update teams set leader_id = v_next, updated_at = now() where id = p_team_id;
  end if;

  return false;
end;
$$;

-- PostgREST can't express the anti-join against team_members or an ilike
-- over concatenated name parts, so this is an RPC. p_pattern is passed as a
-- bound parameter from repository.py's _ilike_pattern() -- never build it
-- with string interpolation in Python or SQL.
create or replace function search_available_participants(p_pattern text, p_exclude uuid)
returns table (id uuid, email text, full_name text, checked_in boolean)
language sql stable as $$
  select d.id, d.email, d.full_name, d.checked_in
  from participant_directory d
  where d.checked_in
    and d.id <> p_exclude
    and not exists (select 1 from team_members m where m.participant_id = d.id)
    and (d.full_name ilike p_pattern or d.email ilike p_pattern)
  order by d.full_name
  limit 5;
$$;

-- Lock down. NOT optional.
--
-- Supabase grants SELECT on new public-schema relations to `anon` by
-- default, and PostgREST serves views -- so without this, the publishable
-- key could read every applicant's email, name, and role straight out of
-- participant_directory. Postgres also grants EXECUTE on new functions to
-- PUBLIC by default, and PostgREST exposes them at /rest/v1/rpc/<name> --
-- so without this, anyone holding the publishable key could call
-- accept_team_invite or leave_team_tx directly and join or dissolve teams,
-- or call search_available_participants to harvest names and emails.
--
-- The three team TABLES are already safe: RLS is on with zero policies,
-- which denies everything to any role that doesn't bypass RLS -- exactly
-- the posture the service-role backend needs.
revoke all on participant_directory from anon, authenticated;
revoke execute on function accept_team_invite(uuid, uuid) from public, anon, authenticated;
revoke execute on function leave_team_tx(uuid, uuid) from public, anon, authenticated;
revoke execute on function search_available_participants(text, uuid) from public, anon, authenticated;

grant select on participant_directory to service_role;
grant execute on function accept_team_invite(uuid, uuid) to service_role;
grant execute on function leave_team_tx(uuid, uuid) to service_role;
grant execute on function search_available_participants(text, uuid) to service_role;
