// Thin wrapper around backend/meals.py.
import { apiFetch } from './api.js';

export function lookupDietaryInfo(participantId) {
  return apiFetch(`/api/meals/lookup/${encodeURIComponent(participantId)}`);
}
