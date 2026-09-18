import { useState } from 'react';
import { createTeam } from '../lib/teamApi.js';

export default function TeamCreateCard({ onCreated }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'error'
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Team name is required.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError('');
    try {
      const created = await createTeam(name);
      setName('');
      setStatus('idle');
      onCreated(created);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not create the team. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="team-card">
      <p className="team-card__title">Create a team</p>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          <span className="application-form__question">Team name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Wolfpack Coders"
            maxLength={80}
            required
          />
        </label>
        {error && <p className="team-card__error" role="alert">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Creating...' : 'Create team'}
        </button>
      </form>
    </div>
  );
}
