import { useState } from 'react';
import { createAnnouncement } from '../lib/announcementsApi.js';

const MAX_LENGTH = 500;

export default function AnnouncementComposer({ onPosted }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'error'
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!message.trim()) {
      setError('Announcement message is required.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError('');
    try {
      await createAnnouncement(message.trim());
      setMessage('');
      setStatus('idle');
      await onPosted();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not send the announcement. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="team-card">
      <p className="team-card__title">Broadcast an announcement</p>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          <span className="application-form__question">Message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Lunch is served in the atrium!"
            maxLength={MAX_LENGTH}
            rows={3}
            required
          />
        </label>
        {error && <p className="team-card__error" role="alert">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending...' : 'Send announcement'}
        </button>
      </form>
    </div>
  );
}
