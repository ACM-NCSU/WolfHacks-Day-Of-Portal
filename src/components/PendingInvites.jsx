import { useState } from 'react';
import { acceptInvite, cancelInvite, declineInvite } from '../lib/teamApi.js';

// One component for both directions -- same row shape, different actions --
// rather than an Incoming/Outgoing pair. mode="incoming" is screen 3 (accept
// / decline); mode="outgoing" is the leader's "Sent invites" block on screen 5.
export default function PendingInvites({ mode, invites, setInvites, onAccepted }) {
  const [pendingActionId, setPendingActionId] = useState(null);
  const [error, setError] = useState('');

  if (invites.length === 0) return null;

  // Optimistic: drop the row immediately, put it back if the call fails --
  // same shape as TrackChallengePicker's track/challenge writes. Accepting
  // additionally clears the whole incoming list on success, since
  // accept_team_invite already cancels the accepter's other pending invites
  // server-side -- there's nothing stale left to show.
  async function act(invite, run) {
    const previous = invites;
    setPendingActionId(invite.id);
    setError('');
    setInvites(invites.filter((i) => i.id !== invite.id));
    try {
      await run();
    } catch (err) {
      console.error(err);
      setInvites(previous);
      setError(err.message || 'That action failed. Please try again.');
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <div className="team-card">
      <p className="team-card__title">{mode === 'incoming' ? 'Pending invites' : 'Sent invites'}</p>
      {error && <p className="team-card__error" role="alert">{error}</p>}
      <ul className="team-invite-list">
        {invites.map((invite) => {
          const busy = pendingActionId === invite.id;
          return (
            <li className="team-invite" key={invite.id}>
              {mode === 'incoming' ? (
                <>
                  <div className="team-invite__info">
                    <span className="team-invite__name">{invite.team_name}</span>
                    <span className="team-invite__meta">
                      invited by {invite.invited_by_name} · {invite.member_count}/4 members
                    </span>
                  </div>
                  <div className="team-invite__actions">
                    <button
                      className="btn btn--ghost"
                      type="button"
                      disabled={busy}
                      onClick={() => act(invite, () => declineInvite(invite.id))}
                    >
                      Decline
                    </button>
                    <button
                      className="btn btn--primary"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        act(invite, async () => {
                          const team = await acceptInvite(invite.id);
                          setInvites([]);
                          onAccepted(team);
                        })
                      }
                    >
                      {busy ? 'Working...' : 'Accept'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="team-invite__info">
                    <span className="team-invite__name">{invite.invited_participant_name}</span>
                    <span className="team-invite__meta">{invite.invited_participant_email} · pending</span>
                  </div>
                  <div className="team-invite__actions">
                    <button
                      className="btn btn--ghost"
                      type="button"
                      disabled={busy}
                      onClick={() => act(invite, () => cancelInvite(invite.team_id, invite.id))}
                    >
                      {busy ? 'Working...' : 'Cancel'}
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
