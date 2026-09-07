// Stands in for the FastAPI backend (backend/teams.py, TD-14..18) until
// Phase 3/4 land. Function names and shapes mirror the real API on purpose --
// see plan.md TD-23 -- so swapping a component from this module to apiFetch
// calls later is a one-line change per call site, not a rewrite.
//
// State lives in module-level variables and resets on page reload; that's
// fine, it exists only to make every dashboard state reachable and every
// action (create/invite/accept/decline/leave/edit) actually testable before
// there's a real database.

const MAX_TEAM_SIZE = 4;

function delay(ms = 220) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class LoginError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'LoginError';
    this.reason = reason; // 'not_registered' | 'not_checked_in'
  }
}

export class MockApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MockApiError';
  }
}

// One participant per login-flow / dashboard-state combination so every
// screen in plan.md is reachable just by logging in as a different email:
//   sam@ncsu.edu    -- checked in, no team                  (screen 2)
//   alex@ncsu.edu   -- checked in, has a pending invite      (screen 3)
//   taylor@ncsu.edu -- checked in, on Wolfpack Coders (member) (screen 4)
//   jordan@ncsu.edu -- checked in, leads Wolfpack Coders     (screen 5)
//   morgan@ncsu.edu -- checked in, no team (search/invite target)
//   casey@ncsu.edu  -- registered but NOT checked in         (login outcome 2)
//   (any other email) -- not registered at all               (login outcome 3)
const participants = [
  { id: 'p-sam', email: 'sam@ncsu.edu', full_name: 'Sam Shah', checked_in: true },
  { id: 'p-alex', email: 'alex@ncsu.edu', full_name: 'Alex Lee', checked_in: true },
  { id: 'p-taylor', email: 'taylor@ncsu.edu', full_name: 'Taylor Patel', checked_in: true },
  { id: 'p-jordan', email: 'jordan@ncsu.edu', full_name: 'Jordan Kim', checked_in: true },
  { id: 'p-morgan', email: 'morgan@ncsu.edu', full_name: 'Morgan Diaz', checked_in: true },
  { id: 'p-casey', email: 'casey@ncsu.edu', full_name: 'Casey Nguyen', checked_in: false },
];

let teams = [
  {
    id: 't-wolfpack',
    name: 'Wolfpack Coders',
    leader_id: 'p-jordan',
    track_slug: 'ai-ml',
    challenge_slugs: ['best-design'],
    member_ids: ['p-jordan', 'p-taylor'],
    joined_at: { 'p-jordan': 1, 'p-taylor': 2 }, // ordering only, for leader transfer
  },
];

let invites = [
  {
    id: 'i-alex-wolfpack',
    team_id: 't-wolfpack',
    invited_participant_id: 'p-alex',
    invited_by: 'p-jordan',
    status: 'pending',
  },
];

let nextTeamId = 1;
let nextInviteId = 1;
let nextJoinOrder = 3;

function findParticipant(id) {
  return participants.find((p) => p.id === id) ?? null;
}

function teamOf(participantId) {
  return teams.find((t) => t.member_ids.includes(participantId)) ?? null;
}

function serializeTeam(team) {
  return {
    ...team,
    members: team.member_ids
      .map((id) => findParticipant(id))
      .filter(Boolean)
      .map((p) => ({ id: p.id, full_name: p.full_name, email: p.email, is_leader: p.id === team.leader_id })),
  };
}

function serializeInvite(invite) {
  const team = teams.find((t) => t.id === invite.team_id);
  return {
    ...invite,
    team_name: team?.name ?? '(deleted team)',
    member_count: team?.member_ids.length ?? 0,
    invited_by_name: findParticipant(invite.invited_by)?.full_name ?? 'Someone',
    invited_participant_name: findParticipant(invite.invited_participant_id)?.full_name ?? 'Someone',
    invited_participant_email: findParticipant(invite.invited_participant_id)?.email ?? '',
  };
}

// --- Auth stub (mirrors POST /api/auth/login + GET /api/auth/me) ---

export async function mockLogin(email) {
  await delay();
  const participant = participants.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
  if (!participant) throw new LoginError('not_registered');
  if (!participant.checked_in) throw new LoginError('not_checked_in');
  return participant;
}

// --- Reads (mirrors GET /api/team/me) ---

export async function mockGetMyState(participantId) {
  await delay();
  const team = teamOf(participantId);
  const incomingInvites = invites
    .filter((i) => i.invited_participant_id === participantId && i.status === 'pending')
    .map(serializeInvite);
  const outgoingInvites = team
    ? invites.filter((i) => i.team_id === team.id && i.status === 'pending').map(serializeInvite)
    : [];
  return {
    team: team ? serializeTeam(team) : null,
    incomingInvites,
    outgoingInvites,
  };
}

// --- Search (mirrors GET /api/participants/search) ---

export async function mockSearchParticipants(query, excludeParticipantId) {
  await delay(150);
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return participants
    .filter((p) => p.checked_in && p.id !== excludeParticipantId && !teamOf(p.id))
    .filter((p) => p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
    .slice(0, 5);
}

// --- Team lifecycle ---

export async function mockCreateTeam(participantId, name) {
  await delay();
  if (teamOf(participantId)) throw new MockApiError('You are already on a team.');
  const trimmed = name.trim();
  if (!trimmed) throw new MockApiError('Team name is required.');
  if (teams.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new MockApiError('That team name is already taken.');
  }
  const team = {
    id: `t-${nextTeamId++}`,
    name: trimmed,
    leader_id: participantId,
    track_slug: null,
    challenge_slugs: [],
    member_ids: [participantId],
    joined_at: { [participantId]: nextJoinOrder++ },
  };
  teams.push(team);
  return serializeTeam(team);
}

export async function mockUpdateTeam(teamId, patch) {
  await delay();
  const team = teams.find((t) => t.id === teamId);
  if (!team) throw new MockApiError('Team not found.');
  Object.assign(team, patch);
  return serializeTeam(team);
}

export async function mockLeaveTeam(teamId, participantId) {
  await delay();
  const team = teams.find((t) => t.id === teamId);
  if (!team) throw new MockApiError('Team not found.');
  team.member_ids = team.member_ids.filter((id) => id !== participantId);
  delete team.joined_at[participantId];

  if (team.member_ids.length === 0) {
    teams = teams.filter((t) => t.id !== teamId);
    invites = invites.filter((i) => i.team_id !== teamId);
    return { deleted: true };
  }

  if (team.leader_id === participantId) {
    // Earliest-joined remaining member becomes leader.
    const nextLeader = [...team.member_ids].sort((a, b) => team.joined_at[a] - team.joined_at[b])[0];
    team.leader_id = nextLeader;
  }
  return { deleted: false, team: serializeTeam(team) };
}

// --- Invites ---

export async function mockInviteParticipant(teamId, participantId, invitedByParticipantId) {
  await delay();
  const team = teams.find((t) => t.id === teamId);
  if (!team) throw new MockApiError('Team not found.');
  if (team.member_ids.length >= MAX_TEAM_SIZE) throw new MockApiError('Team is already full (max 4 members).');
  if (teamOf(participantId)) throw new MockApiError('That person is already on a team.');
  if (invites.some((i) => i.team_id === teamId && i.invited_participant_id === participantId && i.status === 'pending')) {
    throw new MockApiError('That person already has a pending invite from this team.');
  }
  const invite = {
    id: `i-${nextInviteId++}`,
    team_id: teamId,
    invited_participant_id: participantId,
    invited_by: invitedByParticipantId,
    status: 'pending',
  };
  invites.push(invite);
  return serializeInvite(invite);
}

export async function mockCancelInvite(inviteId) {
  await delay();
  const invite = invites.find((i) => i.id === inviteId);
  if (!invite) throw new MockApiError('Invite not found.');
  invite.status = 'cancelled';
}

export async function mockAcceptInvite(inviteId, participantId) {
  await delay();
  const invite = invites.find((i) => i.id === inviteId && i.status === 'pending');
  if (!invite) throw new MockApiError('This invite is no longer available.');
  if (teamOf(participantId)) throw new MockApiError('You are already on a team.');
  const team = teams.find((t) => t.id === invite.team_id);
  if (!team) throw new MockApiError('That team no longer exists.');
  if (team.member_ids.length >= MAX_TEAM_SIZE) throw new MockApiError('Team is already full (max 4 members).');

  invite.status = 'accepted';
  team.member_ids.push(participantId);
  team.joined_at[participantId] = nextJoinOrder++;

  // Accepting one invite cancels this person's other pending invites.
  invites
    .filter((i) => i.invited_participant_id === participantId && i.status === 'pending' && i.id !== inviteId)
    .forEach((i) => { i.status = 'cancelled'; });
}

export async function mockDeclineInvite(inviteId) {
  await delay();
  const invite = invites.find((i) => i.id === inviteId && i.status === 'pending');
  if (!invite) throw new MockApiError('This invite is no longer available.');
  invite.status = 'declined';
}
