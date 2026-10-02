import { useState } from 'react';
import { inviteByEmail } from '../lib/teamApi.js';

const MAX_TEAM_SIZE = 4;

// Exact-email invites only -- there's deliberately no participant search, so
// hackers can't browse everyone's email address.
export default function InviteByEmail({ team, outgoingInvites, setOutgoingInvites }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  const full = team.members.length >= MAX_TEAM_SIZE;

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your teammate's email address.");
      return;
    }

    setSubmitting(true);
    setError('');
    setSentTo('');
    try {
      const invite = await inviteByEmail(team.id, trimmed);
      // Filter-then-append guards against a poll landing between the POST
      // and its response and already containing this row.
      setOutgoingInvites([...outgoingInvites.filter((i) => i.id !== invite.id), invite]);
      setSentTo(trimmed);
      setEmail('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not send that invite. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="team-card">
      <p className="team-card__title">Invite teammates</p>
      {full ? (
        <p className="team-card__note">Your team is at the 4-member max -- remove someone before inviting.</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <label>
            <span className="application-form__question">Teammate&apos;s email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="The email they registered with"
              autoComplete="off"
              maxLength={254}
            />
          </label>
          <p className="team-card__note">
            Use the email they applied with. They need to be checked in at the event to be invited.
          </p>
          {error && <p className="team-card__error" role="alert">{error}</p>}
          {sentTo && <p className="team-card__note" role="status">Invite sent to {sentTo}.</p>}
          <button className="btn btn--primary" type="submit" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send invite'}
          </button>
        </form>
      )}
    </div>
  );
}
