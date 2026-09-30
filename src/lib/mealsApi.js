// Thin wrapper around backend/meals.py.
import { apiFetch } from './api.js';

export function listMealSlots() {
  return apiFetch('/api/meals/slots');
}

export function scanMeal(participantId, mealSlot) {
  return apiFetch('/api/meals/scan', {
    method: 'POST',
    body: { participant_id: participantId, meal_slot: mealSlot },
  });
}
