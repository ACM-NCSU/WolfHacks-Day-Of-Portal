import { useState } from 'react';
import { updateScheduleItem } from '../lib/scheduleApi.js';

// datetime-local wants "YYYY-MM-DDTHH:mm" in the browser's local time, with
// no timezone designator -- new Date(...) round-trips it correctly in both
// directions since a designator-less string is parsed as local time.
function toLocalInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduleEditForm({ item, onSaved, onCancel }) {
  const [startTime, setStartTime] = useState(toLocalInputValue(item.start_time));
  const [endTime, setEndTime] = useState(toLocalInputValue(item.end_time));
  const [location, setLocation] = useState(item.location || '');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'error'
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      await updateScheduleItem(item.id, {
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        location: location.trim() || null,
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
        <span className="application-form__question">Starts</span>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          required
        />
      </label>
      <label>
        <span className="application-form__question">Ends</span>
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
