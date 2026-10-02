import { useState } from 'react';
import { updateScheduleItem } from '../lib/scheduleApi.js';
import { fromEasternInputValue, toEasternInputValue } from '../lib/eventTime.js';

// The datetime-local inputs hold Eastern wall-clock time, not the device's
// local time, so an organizer whose phone is set to another time zone still
// edits the schedule in event time.
export default function ScheduleEditForm({ item, onSaved, onCancel }) {
  const [startTime, setStartTime] = useState(toEasternInputValue(item.start_time));
  const [endTime, setEndTime] = useState(toEasternInputValue(item.end_time));
  const [location, setLocation] = useState(item.location || '');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'error'
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      await updateScheduleItem(item.id, {
        start_time: fromEasternInputValue(startTime),
        end_time: fromEasternInputValue(endTime),
        // "" (not null) so clearing the field actually clears it -- the
        // backend treats null as "leave unchanged".
        location: location.trim(),
      });
      setStatus('idle');
      await onSaved();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not update the schedule. Please try again.');
      setStatus('error');
    }
  }

  return (
    <form className="schedule-edit" onSubmit={handleSubmit} noValidate>
      <label>
        <span className="application-form__question">Starts (Eastern)</span>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          required
        />
      </label>
      <label>
        <span className="application-form__question">Ends (Eastern)</span>
        <input
          type="datetime-local"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
          required
        />
      </label>
      <label>
        <span className="application-form__question">Location</span>
        <input
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          maxLength={120}
          placeholder="Optional"
        />
      </label>
      {error && <p className="team-card__error" role="alert">{error}</p>}
      <div className="schedule-edit__actions">
        <button className="btn btn--ghost" type="button" onClick={onCancel} disabled={status === 'submitting'}>
          Cancel
        </button>
        <button className="btn btn--primary" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
