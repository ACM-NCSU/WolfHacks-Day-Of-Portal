import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
import Starfield from './Starfield.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import WolfMark from './WolfMark.jsx';
import SchedulePage from './SchedulePage.jsx';
import AnnouncementsPage from './AnnouncementsPage.jsx';
import AnnouncementBanner from './AnnouncementBanner.jsx';
import MealsPage from './MealsPage.jsx';
import CheckInSection from './CheckInSection.jsx';
import TeamDashboard from './TeamDashboard.jsx';
import TracksPage from './TracksPage.jsx';
import usePortalSession from '../hooks/usePortalSession.js';
import useAnnouncements from '../hooks/useAnnouncements.js';
import PORTAL_SECTIONS from '../data/portalSections.js';
import PortalOverview from './PortalOverview.jsx';

// Sections with a real page swap in here; anything absent still falls back
// to the "Coming soon" placeholder below.
const SECTION_COMPONENTS = {
  schedule: SchedulePage,
  tracks: TracksPage,
  team: TeamDashboard,
  announcements: AnnouncementsPage,
  meals: MealsPage,
  checkin: CheckInSection,
};

export { PortalOverview };

// The day-of portal's overall shell: nav across the top, an <Outlet/> below
// for whichever section is active. This is a layout route (see App.jsx) --
// PortalShell itself, and the usePortalSession() session it holds, stays
// mounted while navigating between sections; only the Outlet content
// (PortalOverview / PortalSection) swaps. That's what keeps the
// Supabase session check from re-running on every nav click.
export default function PortalShell() {
  const { participant, status: sessionStatus, logout } = usePortalSession();
  const { announcements } = useAnnouncements();

  // Anonymous visitors are redirected to /portal/login by usePortalSession;
  // don't flash portal content while that navigation is in flight.
  if (sessionStatus !== 'authenticated') {
    return (
      <>
        <Starfield />
        <main className="portal-shell">
          <div className="container portal-shell__container">
            <p className="portal-shell__placeholder-note">
              {sessionStatus === 'loading' ? 'Loading portal...' : 'Redirecting to sign in...'}
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Starfield />
      <AnnouncementBanner key={participant.id} announcements={announcements} participantId={participant.id} />
      <ThemeToggle />
      <main className="portal-shell">
        <div className="container portal-shell__container">
          <header className="portal-shell__header">
            <Link to="/" className="portal-shell__brand">
              <WolfMark className="portal-shell__brand-mark" />
              WolfHacks Portal
            </Link>
            <div className="portal-shell__account">
              <a href="/" className="btn btn--ghost portal-shell__back">Back to main site</a>
              {!participant.is_organizer && (
                <span
                  className={`portal-shell__checkin-badge ${participant.checked_in ? '' : 'portal-shell__checkin-badge--out'}`}
                >
                  {participant.checked_in ? 'Checked in' : 'Not checked in'}
                </span>
              )}
              <span className="portal-shell__account-name">{participant.full_name}</span>
              <button className="portal-shell__account-action" type="button" onClick={logout}>Log out</button>
            </div>
          </header>

          <nav className="portal-shell__nav" aria-label="Portal sections">
            <NavLink
              to="/portal"
              end
              className={({ isActive }) => `portal-shell__nav-link ${isActive ? 'portal-shell__nav-link--active' : ''}`}
            >
              Overview
            </NavLink>
            {PORTAL_SECTIONS.filter((section) =>
              (!section.organizerOnly || participant.is_organizer) &&
              (!section.hackerOnly || !participant.is_organizer)
            ).map((section) => (
              <NavLink
                key={section.id}
                to={section.path}
                className={({ isActive }) => `portal-shell__nav-link ${isActive ? 'portal-shell__nav-link--active' : ''}`}
              >
                {section.label}
              </NavLink>
            ))}
          </nav>

          <Outlet context={{ participant }} />
        </div>
      </main>
    </>
  );
}

export function PortalSection() {
  const { sectionId } = useParams();
  const { participant } = useOutletContext();
  const activeSection = PORTAL_SECTIONS.find((section) => section.id === sectionId);

  if (!activeSection) {
    return <PortalOverview />;
  }

  const SectionComponent = SECTION_COMPONENTS[activeSection.id];
  if (SectionComponent) {
    return <SectionComponent participant={participant} />;
  }

  return (
    <section key={activeSection.id}>
      <div className="portal-shell__intro">
        <p className="eyebrow">{activeSection.eyebrow}</p>
        <h1 className="section__heading">{activeSection.heading}</h1>
      </div>
      <div className="portal-shell__placeholder">
        <p className="portal-shell__placeholder-title">Coming soon</p>
        <p className="portal-shell__placeholder-note">{activeSection.note}</p>
      </div>
    </section>
  );
}
