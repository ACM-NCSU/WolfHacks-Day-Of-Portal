// The event happens in Raleigh, so every time on the portal is shown and
// edited in Eastern time regardless of the viewing device's own time zone.
export const EVENT_TIME_ZONE = 'America/New_York';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function easternParts(date) {
  const parts = {};
  for (const { type, value } of partsFormatter.formatToParts(date)) parts[type] = value;
  return parts;
}

// "YYYY-MM-DD" of the instant in Eastern time -- for grouping by event day.
export function easternDateKey(date) {
  const p = easternParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

// ISO instant -> "YYYY-MM-DDTHH:mm" Eastern wall-clock, for <input type="datetime-local">.
export function toEasternInputValue(iso) {
  const p = easternParts(new Date(iso));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// "YYYY-MM-DDTHH:mm" Eastern wall-clock -> ISO instant.
export function fromEasternInputValue(value) {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Find Eastern's UTC offset at that moment, then shift by it.
  const p = easternParts(new Date(asUtc));
  const easternAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(asUtc - (easternAsUtc - asUtc)).toISOString();
}
