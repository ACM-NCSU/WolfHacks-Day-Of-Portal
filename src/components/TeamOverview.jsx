import { useState } from 'react';
import TrackChallengePicker from './TrackChallengePicker.jsx';
import InviteSearch from './InviteSearch.jsx';
import PendingInvites from './PendingInvites.jsx';
import siteConfig from '../data/siteConfig.js';
import { leaveTeam } from '../lib/teamApi.js';

const { tracks, challenges } = siteConfig.event;

export default function TeamOverview({ team, participant, outgoingInvites, onChanged }) {
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [leaveStatus, setLeaveStatus] = useState('idle'); // 'idle' | 'submitting' | 'error'
  const [error, setError] = useState('');

  const isLeader = team.leader_id === participant.id;
  const track = tracks.find((t) => t.slug === team.track_slug);
  const teamChallenges = challenges.filter((c) => team.challenge_slugs.includes(c.slug));
  const remainingMembers = team.members.filter((m) => m.id !== participant.id);
  const nextLeader = isLeader && remainingMembers.length > 0 ? remainingMembers[0] : null;

  async function handleLeave() {
    setLeaveStatus('submitting');
    setError('');
    try {
      await leaveTeam(team.id);
      await onChanged();
    } catch (err) {
      console.error(err);
      setError('Could not leave the team. Please try again.');
      setLeaveStatus('error');
      setConfirmingLeave(false);
    }
  }

  return (
    <>
      <div className="team-card">
        {(track || teamChallenges.length > 0) && (
          <div className="team-chip-group team-chip-group--tags">
            {track && <span className="team-chip">{track.name}</span>}
            {teamChallenges.map((c) => (
              <span className="team-chip" key={c.slug}>{c.name}</span>
            ))}
          </div>
        )}

        <div className="team-card__row">
          <p className="team-card__title">Members</p>
          <span className="team-count">{team.members.length}/4</span>
        </div>
        <ul className="team-member-list">
          {team.members.map((member) => (
            <li className="team-member" key={member.id}>
              <span className="team-member__name">
                {member.full_name}
                {member.id === participant.id ? ' (you)' : ''}
                {member.is_leader && <span className="team-member__badge">LEADER</span>}
              </span>
              <span className="team-member__email">{member.email}</span>
            </li>
          ))}
        </ul>

        {error && <p className="team-card__error" role="alert">{error}</p>}

        {confirmingLeave ? (
          <div className="team-card__confirm">
            <p className="team-card__note">
              {nextLeader
                ? `Leadership will pass to ${nextLeader.full_name}. Leave ${team.name}?`
                : remainingMembers.length > 0
                  ? `Leave ${team.name}?`
                  : `You're the last member -- leaving will delete ${team.name}. Are you sure?`}
            </p>
            <div className="team-invite__actions">
              <button className="btn btn--ghost" type="button" onClick={() => setConfirmingLeave(false)} disabled={leaveStatus === 'submitting'}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={handleLeave} disabled={leaveStatus === 'submitting'}>
                {leaveStatus === 'submitting' ? 'Leaving...' : 'Yes, leave'}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn--ghost" type="button" onClick={() => setConfirmingLeave(true)}>
            Leave team
          </button>
        )}
      </div>

      {isLeader && (
        <>
          <TrackChallengePicker team={team} onChanged={onChanged} />
          <InviteSearch team={team} onChanged={onChanged} />
          <PendingInvites mode="outgoing" invites={outgoingInvites} onChanged={onChanged} />
        </>
      )}
    </>
  );
}
