// Pure helpers so "what's current/next right now" is computed the same way
// wherever it's needed and is trivially testable without a clock or a component.

export function getItemStatus(item, now) {
  const start = new Date(item.start_time);
  const end = new Date(item.end_time);
  if (now < start) return 'upcoming';
  if (now >= end) return 'past';
  return 'current';
}

// Assumes `schedule` is sorted by start_time ascending (the API guarantees this).
export function findNextItem(schedule, now) {
  return schedule.find((item) => new Date(item.start_time) > now) ?? null;
}
