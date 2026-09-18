import Starfield from './Starfield.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import PortalLogin from './PortalLogin.jsx';
import TeamCreateCard from './TeamCreateCard.jsx';
import PendingInvites from './PendingInvites.jsx';
import TeamOverview from './TeamOverview.jsx';
import useSession from '../hooks/useSession.js';
import useTeamState from '../hooks/useTeamState.js';

export default function TeamDashboard() {
  const { participant, status: sessionStatus, login, logout } = useSession();
  const {
    team,
    incomingInvites,
    outgoingInvites,
    hasLoadedOnce,
    setTeam,
    setIncomingInvites,
    setOutgoingInvites,
  } = useTeamState(participant);

  const eyebrow = sessionStatus === 'authenticated' ? 'YOUR TEAM' : 'TEAM DASHBOARD';
  let heading = 'Find your team.';
  if (sessionStatus === 'authenticated') {
    heading = team ? team.name : "You're not on a team yet.";
  }

  return (
    <>
      <Starfield />
      <ThemeToggle />
      <main className="team-page">
        <div className="container team-page__container">
          <div className="team-page__topline">
            <a href="/" className="team-page__back">&larr; Back to WolfHacks</a>
            {sessionStatus === 'authenticated' && (
              <button className="team-page__logout" type="button" onClick={logout}>Log out</button>
            )}
          </div>

          <div className="team-page__intro">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="section__heading">{heading}</h1>
          </div>

          {sessionStatus === 'restoring' && <p className="team-card__note">Loading...</p>}

          {sessionStatus === 'anonymous' && <PortalLogin onLogin={login} />}

          {sessionStatus === 'authenticated' && participant && (
            !hasLoadedOnce ? (
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
            )
          )}
        </div>
      </main>
    </>
  );
}
