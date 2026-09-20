// Thin wrapper around backend/announcements.py.
import { apiFetch } from './api.js';

export async function listAnnouncements() {
  const json = await apiFetch('/api/announcements');
  return json.announcements;
}

export function createAnnouncement(message) {
  return apiFetch('/api/announcements', { method: 'POST', body: { message } });
}
