import { useState } from 'react';
import { mockAcceptInvite, mockCancelInvite, mockDeclineInvite } from '../data/mockTeamState.js';

// One component for both directions -- same row shape, different actions --
// rather than an Incoming/Outgoing pair. mode="incoming" is screen 3 (accept
// / decline); mode="outgoing" is the leader's "Sent invites" block on screen 5.
export default function PendingInvites({ mode, invites, onChanged }) {
  const [pendingActionId, setPendingActionId] = useState(null);
  const [error, setError] = useState('');

  if (invites.length === 0) return null;

  async function act(inviteId, action) {
    setPendingActionId(inviteId);
    setError('');
    try {
      await action();
      await onChanged();
    } catch (err) {
      console.error(err);
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
                      onClick={() => act(invite.id, () => mockDeclineInvite(invite.id))}
                    >
                      Decline
                    </button>
                    <button
                      className="btn btn--primary"
                      type="button"
                      disabled={busy}
                      onClick={() => act(invite.id, () => mockAcceptInvite(invite.id, invite.invited_participant_id))}
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
                      onClick={() => act(invite.id, () => mockCancelInvite(invite.id))}
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
