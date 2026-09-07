import { useState } from 'react';
import { LoginError } from '../data/mockTeamState.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Screen 1 of the team dashboard. Renders #5's three login outcomes as
// inline messages -- checked in / registered but not checked in / not
// registered at all -- so the real login (issue #5) can reuse this copy.
export default function PortalLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'error'
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Please enter a valid email address.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError('');
    try {
      await onLogin(email.trim());
    } catch (err) {
      if (err instanceof LoginError && err.reason === 'not_checked_in') {
        setError("You're registered, but not checked in yet. Find an organizer to check in before using the portal.");
      } else if (err instanceof LoginError && err.reason === 'not_registered') {
        setError("We couldn't find that email among our registrants. Double check it, or make sure you've applied.");
      } else {
        console.error(err);
        setError('Something went wrong logging you in. Please try again.');
      }
      setStatus('error');
    }
  }

  return (
    <div className="team-card">
      <form onSubmit={handleSubmit} noValidate>
        <label>
          <span className="application-form__question">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="username@example.com"
            required
          />
        </label>
        {error && <p className="team-card__error" role="alert">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Checking...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
