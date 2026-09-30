import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
import Starfield from './Starfield.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import WolfMark from './WolfMark.jsx';
import Countdown from './Countdown.jsx';
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
import siteConfig from '../data/siteConfig.js';

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

// The day-of portal's overall shell: nav across the top, an <Outlet/> below
// for whichever section is active. This is a layout route (see App.jsx) --
// PortalShell itself, and the usePortalSession() session it holds, stays
// mounted while navigating between sections; only the Outlet content
// (PortalOverview / PortalSection below) swaps. That's what keeps the
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
      <AnnouncementBanner announcements={announcements} />
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

export function PortalOverview() {
  const { event } = siteConfig;

  return (
    <section>
      <div className="portal-shell__intro">
        <p className="eyebrow">TIME LEFT IN THE HACKATHON</p>
        <h1 className="section__heading">Keep building.</h1>
        <Countdown target={event.hackathonEndTarget} />
        <p className="portal-shell__placeholder-note" style={{ marginTop: 12 }}>
          Counts down to the Day 2 project submissions deadline -- see the Schedule tab for the
          full agenda.
        </p>
      </div>

      <div className="portal-shell__intro">
        <p className="eyebrow">GENERAL INFO</p>
        <h2 className="section__heading">About WolfHacks</h2>
        <p className="section__lede">
          {event.hero.subhead}
        </p>
      </div>

      <div className="team-card">
        <p className="team-card__title">Venue &amp; parking</p>
        <p className="team-card__note">
          {event.location}, inside the James B. Hunt Jr. Library on NC State's Centennial Campus.
          Parking is free on Centennial Campus from 5 PM Friday to 7 AM Monday.
        </p>
      </div>

      <div className="team-card">
        <p className="team-card__title">Need help?</p>
        <p className="team-card__note">
          Look for staff wearing organizer badges, ask in the event Discord, or email{' '}
          <a href="mailto:acmchapter-org@ncsu.edu">acmchapter-org@ncsu.edu</a>.
        </p>
      </div>

      <div className="team-card">
        <p className="team-card__title">Code of conduct</p>
        <p className="team-card__note">
          WolfHacks follows the{' '}
          <a href={event.codeOfConduct} target="_blank" rel="noreferrer">
            MLH Code of Conduct
          </a>
          . Report any concerns to a staff member immediately.
        </p>
      </div>
    </section>
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
