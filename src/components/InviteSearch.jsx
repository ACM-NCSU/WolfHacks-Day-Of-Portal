import { useEffect, useRef, useState } from 'react';
import { inviteParticipant, searchParticipants } from '../lib/teamApi.js';

const MAX_TEAM_SIZE = 4;

export default function InviteSearch({ team, outgoingInvites, setOutgoingInvites }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [error, setError] = useState('');
  const wrapperRef = useRef(null);

  const full = team.members.length >= MAX_TEAM_SIZE;

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (full || !query.trim()) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    // Debounce -- this now hits a real database per search, not an
    // in-memory list, so one request per keystroke isn't free anymore.
    const timeoutId = setTimeout(() => {
      searchParticipants(query)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setError('');
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('Participant search failed:', err);
          setResults([]);
          setError('Search is temporarily unavailable. Please try again.');
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query, full]);

  async function invite(target) {
    setInvitingId(target.id);
    setError('');
    try {
      const invite = await inviteParticipant(team.id, target.id);
      setResults((current) => current.filter((r) => r.id !== target.id));
      // Filter-then-append guards against a poll landing between the POST
      // and its response and already containing this row.
      setOutgoingInvites([...outgoingInvites.filter((i) => i.id !== invite.id), invite]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not send that invite. Please try again.');
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <div className="team-card">
      <p className="team-card__title">Invite teammates</p>
      {full ? (
        <p className="team-card__note">Your team is at the 4-member max -- remove someone before inviting.</p>
      ) : (
        <>
          <div className="application-form__searchable" ref={wrapperRef}>
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search by name or email"
            />
            {open && results.length > 0 && (
              <div className="application-form__dropdown">
                {results.map((result) => (
                  <div className="application-form__dropdown-item team-invite-result" key={result.id}>
                    <span>
                      {result.full_name} <span className="team-invite-result__email">{result.email}</span>
                    </span>
                    <button
                      className="btn btn--primary"
                      type="button"
                      disabled={invitingId === result.id}
                      onClick={(event) => {
                        event.preventDefault();
                        invite(result);
                      }}
                    >
                      {invitingId === result.id ? 'Inviting...' : 'Invite'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <p className="team-card__error" role="alert">{error}</p>}
        </>
      )}
    </div>
  );
}
