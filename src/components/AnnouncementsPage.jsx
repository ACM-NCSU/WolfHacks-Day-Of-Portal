import AnnouncementComposer from './AnnouncementComposer.jsx';
import AnnouncementList from './AnnouncementList.jsx';
import useAnnouncements from '../hooks/useAnnouncements.js';

// Rendered inside PortalShell's 'announcements' section -- PortalShell
// already guarantees an authenticated `participant` before this ever mounts.
export default function AnnouncementsPage({ participant }) {
  const { announcements, status: feedStatus, refresh } = useAnnouncements();

  return (
    <section>
      <div className="portal-shell__intro">
        <p className="eyebrow">ANNOUNCEMENTS</p>
        <h1 className="section__heading">Quick, important updates from the organizers.</h1>
      </div>

      {participant.is_organizer ? (
        <AnnouncementComposer onPosted={refresh} />
      ) : (
        <p className="team-card__note">Only organizers can post announcements.</p>
      )}

      <div className="team-card">
        <p className="team-card__title">Feed</p>
        {feedStatus === 'error' ? (
          <p className="team-card__error" role="alert">Could not load announcements. Please refresh the page.</p>
        ) : (
          <AnnouncementList
            announcements={announcements}
            emptyMessage={feedStatus === 'loading' ? 'Loading...' : 'No announcements yet.'}
          />
        )}
      </div>
    </section>
  );
}
