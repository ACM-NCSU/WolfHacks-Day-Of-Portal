// Thin wrapper around the backend/teams.py + backend/auth_stub.py endpoints.
// Function names mirror the old src/data/mockTeamState.js on purpose -- this
// was the planned swap point (plan.md TD-19b), so component code barely
// changes, just what it imports.
import { apiFetch, ApiError } from './api.js';

export class LoginError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'LoginError';
    this.reason = reason; // 'not_registered' | 'not_checked_in'
  }
}

export async function login(email) {
  try {
    return await apiFetch('/api/auth/login', { method: 'POST', body: { email } });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw new LoginError('not_registered');
    if (err instanceof ApiError && err.status === 403) throw new LoginError('not_checked_in');
    throw err;
  }
}

export function me() {
  return apiFetch('/api/auth/me');
}

export async function getMyState() {
  const json = await apiFetch('/api/team/me');
  return {
    team: json.team,
    incomingInvites: json.incoming_invites,
    outgoingInvites: json.outgoing_invites,
  };
}

export async function searchParticipants(query) {
  if (!query.trim()) return [];
  const json = await apiFetch(`/api/participants/search?q=${encodeURIComponent(query)}`);
  return json.results;
}

export function createTeam(name) {
  return apiFetch('/api/teams', { method: 'POST', body: { name } });
}

export function updateTeam(teamId, patch) {
  return apiFetch(`/api/teams/${teamId}`, { method: 'PATCH', body: patch });
}

export function leaveTeam(teamId) {
  return apiFetch(`/api/teams/${teamId}/members/me`, { method: 'DELETE' });
}

export function inviteParticipant(teamId, participantId) {
  return apiFetch(`/api/teams/${teamId}/invites`, { method: 'POST', body: { participant_id: participantId } });
}

export function cancelInvite(teamId, inviteId) {
  return apiFetch(`/api/teams/${teamId}/invites/${inviteId}`, { method: 'DELETE' });
}

export function acceptInvite(inviteId) {
  return apiFetch(`/api/invites/${inviteId}/accept`, { method: 'POST' });
}

export function declineInvite(inviteId) {
  return apiFetch(`/api/invites/${inviteId}/decline`, { method: 'POST' });
}
