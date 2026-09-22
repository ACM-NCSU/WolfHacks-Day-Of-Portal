import TeamCreateCard from './TeamCreateCard.jsx';
import PendingInvites from './PendingInvites.jsx';
import TeamOverview from './TeamOverview.jsx';
import useTeamState from '../hooks/useTeamState.js';

// Rendered inside PortalShell's 'team' section -- PortalShell already
// guarantees an authenticated `participant` before this ever mounts.
export default function TeamDashboard({ participant }) {
  const {
    team,
    incomingInvites,
    outgoingInvites,
    hasLoadedOnce,
    setTeam,
    setIncomingInvites,
    setOutgoingInvites,
  } = useTeamState(participant);

  return (
    <section>
      <div className="portal-shell__intro">
        <p className="eyebrow">TEAM</p>
        <h1 className="section__heading">{team ? team.name : "You're not on a team yet."}</h1>
      </div>

      {!hasLoadedOnce ? (
        <p className="team-card__note">Loading your team...</p>
      ) : team ? (
        <TeamOverview
          team={team}
          participant={participant}
          outgoingInvites={outgoingInvites}
          onTeamUpdate={setTeam}
          setOutgoingInvites={setOutgoingInvites}
        />
      ) : (
        <>
          <PendingInvites
            mode="incoming"
            invites={incomingInvites}
            setInvites={setIncomingInvites}
            onAccepted={setTeam}
          />
          <TeamCreateCard onCreated={setTeam} />
          <p className="section__lede">
            A team leader can also add you by searching your name or email.
          </p>
        </>
      )}
    </section>
  );
}
