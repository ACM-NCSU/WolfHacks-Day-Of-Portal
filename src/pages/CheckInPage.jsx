import { useEffect, useState } from 'react';
import ThemeToggle from '../components/ThemeToggle.jsx';
import Starfield from '../components/Starfield.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');
const STAFF_KEY_STORAGE = 'wolfhacks_staff_key';

export default function CheckInPage() {
  const [staffKey, setStaffKey] = useState(() => sessionStorage.getItem(STAFF_KEY_STORAGE) ?? '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [errorMessage, setErrorMessage] = useState('');
  const [checkingInId, setCheckingInId] = useState(null);

  useEffect(() => {
    sessionStorage.setItem(STAFF_KEY_STORAGE, staffKey);
  }, [staffKey]);

  async function handleSearch(event) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setStatus('loading');
    setErrorMessage('');
    try {
      const response = await fetch(`${API_URL}/api/checkin/search?q=${encodeURIComponent(trimmed)}`, {
        headers: { 'X-Staff-Key': staffKey },
      });
      if (response.status === 401) {
        setStatus('error');
        setErrorMessage('Invalid staff key.');
        setResults(null);
        return;
      }
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || `Search failed (${response.status})`);
      }
      const data = await response.json();
      setResults(data);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Search failed. Please try again.');
      setResults(null);
    }
  }

  async function handleCheckIn(id) {
    setCheckingInId(id);
    try {
      const response = await fetch(`${API_URL}/api/checkin/${id}`, {
        method: 'POST',
        headers: { 'X-Staff-Key': staffKey },
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || `Check-in failed (${response.status})`);
      }
      const updated = await response.json();
      setResults((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setErrorMessage(err.message || 'Check-in failed. Please try again.');
    } finally {
      setCheckingInId(null);
    }
  }

  return (
    <>
      <Starfield />
      <ThemeToggle />
      <main className="apply-page">
        <div className="container apply-page__container checkin-page">
          <div className="apply-page__intro">
            <p className="eyebrow">STAFF ONLY</p>
            <h1 className="section__heading">Event Check-In</h1>
            <p className="section__lede">
              Search a registrant by email or name and confirm they're checked in. Only checked-in
              registrants can log into the day-of portal.
            </p>
          </div>

          <label className="checkin-page__key">
            <span className="application-form__question">Staff Key</span>
            <input
              type="password"
              value={staffKey}
              onChange={(e) => setStaffKey(e.target.value)}
              placeholder="Enter the staff check-in key"
              autoComplete="off"
            />
          </label>

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
            <button type="submit" className="btn btn--primary" disabled={status === 'loading' || !staffKey}>
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
        </div>
      </main>
    </>
  );
}
