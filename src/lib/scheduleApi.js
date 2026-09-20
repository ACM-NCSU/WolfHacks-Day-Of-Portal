// Thin wrapper around backend/schedule.py.
import { apiFetch } from './api.js';

export async function listSchedule() {
  const json = await apiFetch('/api/schedule');
  return json.schedule;
}

export function updateScheduleItem(itemId, patch) {
  return apiFetch(`/api/schedule/${itemId}`, { method: 'PATCH', body: patch });
}
