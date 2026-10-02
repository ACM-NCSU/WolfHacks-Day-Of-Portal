-- Team dashboard (issue #4), Phase 4 -- dev seed data.
--
-- Run this against the SAME dev Supabase project as
-- backend/supabase_dev_bootstrap.sql, after that file. Mirrors the six
-- accounts from the old in-memory backend/repository.py so the manual
-- walkthrough in docs/testing-team-dashboard.md still works unchanged,
-- except ids are now real uuids instead of "p-sam" style strings.
--
-- Re-runnable: re-running this script resets team/invite state back to the
-- seed and re-creates the six accounts.

delete from teams; -- cascades to team_members, team_invites
delete from applications where email like '%@ncsu.edu';

insert into applications (
  id, first_name, last_name, email, age, country_of_residence,
  discord_username, phone_number, classification,
  mlh_code_of_conduct, mlh_data_authorization, checked_in, accepted
) values
  ('00000000-0000-0000-0000-000000000001', 'Sam',    'Shah',   'sam@ncsu.edu',    20, 'United States', 'samshah',    '555-0101', 'Sophomore', true, true, true, true),
  ('00000000-0000-0000-0000-000000000002', 'Alex',   'Lee',    'alex@ncsu.edu',   21, 'United States', 'alexlee',    '555-0102', 'Junior',    true, true, true, true),
  ('00000000-0000-0000-0000-000000000003', 'Taylor', 'Patel',  'taylor@ncsu.edu', 19, 'United States', 'taylorp',    '555-0103', 'Freshman',  true, true, true, true),
  ('00000000-0000-0000-0000-000000000004', 'Jordan', 'Kim',    'jordan@ncsu.edu', 22, 'United States', 'jordankim',  '555-0104', 'Senior',    true, true, true, true),
  ('00000000-0000-0000-0000-000000000005', 'Morgan', 'Diaz',   'morgan@ncsu.edu', 20, 'United States', 'morgand',    '555-0105', 'Sophomore', true, true, true, true),
  -- Casey is registered but NOT checked in -- login must be blocked (403).
  -- Also not accepted, to exercise the "Not accepted" check-in flag.
  ('00000000-0000-0000-0000-000000000006', 'Casey',  'Nguyen', 'casey@ncsu.edu',  21, 'United States', 'caseyn',     '555-0106', 'Junior',    true, true, false, false);

-- Wolfpack Coders: Jordan leads, Taylor is a member, Alex has a pending
-- invite. Staggered joined_at so leader-transfer order (earliest-joined
-- remaining member) is deterministic if Jordan leaves during testing.
insert into teams (id, name, leader_id, track_slug, challenge_slugs, created_at, updated_at)
values (
  '00000000-0000-0000-0000-0000000000a1',
  'Wolfpack Coders',
  '00000000-0000-0000-0000-000000000004', -- Jordan
  'ai-ml',
  array['best-design'],
  now(),
  now()
);

insert into team_members (team_id, participant_id, joined_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000004', now() - interval '2 hours'), -- Jordan, joined first
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000003', now() - interval '1 hour');  -- Taylor, joined second

insert into team_invites (id, team_id, invited_participant_id, invited_by, status, created_at)
values (
  '00000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000002', -- Alex
  '00000000-0000-0000-0000-000000000004', -- invited by Jordan
  'pending',
  now()
);
