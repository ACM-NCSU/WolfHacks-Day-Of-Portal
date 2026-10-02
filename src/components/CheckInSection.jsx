import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';

const STATS_POLL_MS = 15_000;

// Rendered inside PortalShell's 'checkin' section -- PortalShell already
// guarantees an authenticated `participant` before this ever mounts, so this
// only needs to gate on role, not session (compare AnnouncementsPage).
export default function CheckInSection({ participant }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [errorMessage, setErrorMessage] = useState('');
  const [checkingInId, setCheckingInId] = useState(null);
  const [stats, setStats] = useState(null);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await apiFetch('/api/checkin/stats'));
    } catch (err) {
      console.error('Failed to load check-in stats:', err);
    }
  }, []);

  useEffect(() => {
    if (!participant.is_organizer) return undefined;
    refreshStats();
    // Poll so the count reflects check-ins from every station, not just
    // the ones made on this device.
    const interval = setInterval(refreshStats, STATS_POLL_MS);
    return () => clearInterval(interval);
  }, [participant.is_organizer, refreshStats]);

  async function handleSearch(event) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setStatus('loading');
    setErrorMessage('');
    try {
      const data = await apiFetch(`/api/checkin/search?q=${encodeURIComponent(trimmed)}`);
      setResults(data);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'Search failed. Please try again.');
      setResults(null);
    }
  }

  async function handleCheckIn(id) {
    setCheckingInId(id);
    setErrorMessage('');
    try {
      const updated = await apiFetch(`/api/checkin/${id}`, { method: 'POST' });
      setResults((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      refreshStats();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Check-in failed. Please try again.');
    } finally {
      setCheckingInId(null);
    }
  }

  if (!participant.is_organizer) {
    return (
      <section>
        <div className="portal-shell__intro">
          <p className="eyebrow">STAFF ONLY</p>
          <h1 className="section__heading">Organizers only</h1>
          <p className="section__lede">
            This tool is restricted to WolfHacks organizers. If you believe this is a mistake,
            contact an organizer.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="portal-shell__intro">
        <p className="eyebrow">STAFF ONLY</p>
        <h1 className="section__heading">Event check-in</h1>
        <p className="section__lede">
          Search a registrant by email or name and confirm they're checked in. Only checked-in
          registrants can log into the day-of portal.
        </p>
      </div>

      {stats && (
        <div className="team-card checkin-page__stats">
          <p className="team-card__title">Hackers checked in</p>
          <p className="checkin-page__stats-count">{stats.checked_in}</p>
        </div>
      )}

      <form className="checkin-page__search" onSubmit={handleSearch}>
        <label>
          <span className="application-form__question">Search by email or name</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="username@example.com or Jane Doe"
            autoComplete="off"
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={status === 'loading'}>
          {status === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </form>

      {errorMessage && <p className="application-form__field-error">{errorMessage}</p>}

      {results && results.length === 0 && (
        <p className="checkin-page__empty">
          No matching registrant found. They did not register — add them to the waitlist.
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="checkin-page__results">
          {results.map((r) => (
            <li key={r.id} className="checkin-page__result">
              <div className="checkin-page__result-info">
                <span className="checkin-page__result-name">
                  {r.first_name} {r.last_name}
                </span>
                <span className="checkin-page__result-email">{r.email}</span>
                {r.accepted ? (
                  <span className="checkin-page__badge checkin-page__badge--accepted">Accepted</span>
                ) : (
                  <span className="checkin-page__badge checkin-page__badge--rejected">Not accepted</span>
                )}
              </div>
              {r.checked_in ? (
                <span className="checkin-page__badge checkin-page__badge--done">Checked in</span>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={checkingInId === r.id}
                  onClick={() => handleCheckIn(r.id)}
                >
                  {checkingInId === r.id ? 'Checking in…' : 'Check In'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
