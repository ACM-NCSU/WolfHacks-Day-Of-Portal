// Thin wrapper around the backend/teams.py endpoints.
import { apiFetch } from './api.js';

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
