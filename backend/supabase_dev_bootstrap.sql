-- Team dashboard (issue #4), Phase 4 -- dev database bootstrap.
--
-- Run this in a SEPARATE, DEV-ONLY Supabase project's SQL editor, AFTER
-- running backend/supabase_schema.sql there. Never run this against the
-- shared production project -- Part A recreates columns that #1 and #5
-- already own there, and this file is not the source of truth for them.
--
-- Parts B-D are what eventually goes to production, once #1 and #5's PRs
-- merge and someone documents their columns in supabase_schema.sql for real.
-- Part A exists only so a dev project started from a clean schema file has
-- something to test team tables against.

-- =========================================================================
-- PART A (dev only): columns #1 (check-in) and #5 (login) already shipped
-- to the shared Supabase project. checked_in/checked_in_at are committed on
-- feature/event-check-in; user_id/discord_id/role are live in Supabase but
-- not yet in any branch's DDL. We only ever READ these columns.
-- =========================================================================
alter table applications add column if not exists checked_in boolean not null default false;
alter table applications add column if not exists checked_in_at timestamptz;
alter table applications add column if not exists user_id uuid references auth.users(id);
alter table applications add column if not exists discord_id text;
alter table applications add column if not exists role text not null default 'hacker';
create index if not exists applications_email_lower_idx on applications (lower(email));

-- =========================================================================
-- PART B: read-only identity view. Gives us full_name without adding a
-- column to a table we don't own. security_invoker means the view runs
-- with the CALLER's privileges, not its owner's -- required so applications'
-- RLS actually applies through the view instead of being bypassed by it.
-- =========================================================================
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

-- Requires Postgres 15+. Any Supabase project created recently qualifies.
-- If this errors on an older project, drop it -- the REVOKE in Part E is
-- what actually closes the anon-read hole; the backend's service-role key
-- bypasses RLS regardless of this setting.
alter view participant_directory set (security_invoker = on);

-- =========================================================================
-- PART C: team tables. Every identity FK points at applications(id) --
-- there is no separate participants table.
-- =========================================================================
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
-- reads or writes these tables, matching write_to_supabase() in main.py.
-- Live updates are done by polling the FastAPI backend (see TD-26), not by
-- browser-side Supabase Realtime, so no anon SELECT policy is needed here.

-- =========================================================================
-- PART D: functions. These raise MACHINE-readable codes (via errcode/message)
-- that backend/repository.py translates into the exact user-facing strings
-- teams.py already returns. No UI copy belongs in this file.
-- =========================================================================

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

-- =========================================================================
-- PART E: lock down. NOT optional.
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
-- =========================================================================
revoke all on participant_directory from anon, authenticated;
revoke execute on function accept_team_invite(uuid, uuid) from public, anon, authenticated;
revoke execute on function leave_team_tx(uuid, uuid) from public, anon, authenticated;
revoke execute on function search_available_participants(text, uuid) from public, anon, authenticated;

grant select on participant_directory to service_role;
grant execute on function accept_team_invite(uuid, uuid) to service_role;
grant execute on function leave_team_tx(uuid, uuid) to service_role;
grant execute on function search_available_participants(text, uuid) to service_role;
