import Starfield from './Starfield.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import WolfMark from './WolfMark.jsx';
import SchedulePage from './SchedulePage.jsx';
import AnnouncementsPage from './AnnouncementsPage.jsx';
import usePortalSession from '../hooks/usePortalSession.js';
import PORTAL_SECTIONS from '../data/portalSections.js';

// Sections with a real page swap in here; anything absent still falls back
// to the "Coming soon" placeholder below. 'team' is intentionally absent --
// a teammate owns that feature separately (see src/components/TeamDashboard.jsx,
// left in place and ready to re-enable).
const SECTION_COMPONENTS = {
  schedule: SchedulePage,
  announcements: AnnouncementsPage,
};

// The day-of portal's overall shell: nav across the top, one placeholder
// card per section below. Each feature branch swaps its section's
// PortalPlaceholder for the real page -- the nav/session chrome around it
// doesn't change. `sectionId` is undefined for the /portal overview.
export default function PortalShell({ sectionId }) {
  const { participant, status: sessionStatus, logout } = usePortalSession();
  const activeSection = PORTAL_SECTIONS.find((section) => section.id === sectionId);

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
      <ThemeToggle />
      <main className="portal-shell">
        <div className="container portal-shell__container">
          <header className="portal-shell__header">
            <a href="/" className="portal-shell__brand">
              <WolfMark className="portal-shell__brand-mark" />
              WolfHacks Portal
            </a>
            <div className="portal-shell__account">
              <span className="portal-shell__account-name">{participant.full_name}</span>
              <button className="portal-shell__account-action" type="button" onClick={logout}>Log out</button>
            </div>
          </header>

          <nav className="portal-shell__nav" aria-label="Portal sections">
            <a href="/portal" className={`portal-shell__nav-link ${!sectionId ? 'portal-shell__nav-link--active' : ''}`}>
              Overview
            </a>
            {PORTAL_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={section.path}
                className={`portal-shell__nav-link ${sectionId === section.id ? 'portal-shell__nav-link--active' : ''}`}
              >
                {section.label}
              </a>
            ))}
          </nav>

          {activeSection ? (
            <section key={activeSection.id}>
              {(() => {
                const SectionComponent = SECTION_COMPONENTS[activeSection.id];
                if (SectionComponent) {
                  return <SectionComponent participant={participant} />;
                }
                return (
                  <>
                    <div className="portal-shell__intro">
                      <p className="eyebrow">{activeSection.eyebrow}</p>
                      <h1 className="section__heading">{activeSection.heading}</h1>
                    </div>
                    {activeSection.id === 'checkin' ? (
                      <div className="team-card">
                        <p className="team-card__title">Check-in status</p>
                        <p className="team-card__note">
                          {participant.checked_in
                            ? "You're checked in. Welcome!"
                            : 'Not checked in yet -- see staff at registration.'}
                        </p>
                      </div>
                    ) : activeSection.qr ? (
                      <div className="portal-shell__qr-card">
                        <div className="portal-shell__qr" aria-label="QR code placeholder">
                          <span>QR CODE</span>
                        </div>
                        <p className="portal-shell__placeholder-note">{activeSection.note}</p>
                      </div>
                    ) : (
                      <div className="portal-shell__placeholder">
                        <p className="portal-shell__placeholder-title">Coming soon</p>
                        <p className="portal-shell__placeholder-note">{activeSection.note}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </section>
          ) : (
            <section>
              <div className="portal-shell__intro">
                <p className="eyebrow">PORTAL</p>
                <h1 className="section__heading">Everything for today, in one place.</h1>
                <p className="section__lede">You're logged in. Pick a section above to get started.</p>
              </div>
              <div className="portal-shell__grid">
                {PORTAL_SECTIONS.map((section) => (
                  <a key={section.id} href={section.path} className="portal-shell__card">
                    <p className="portal-shell__card-title">{section.label}</p>
                    <p className="portal-shell__card-note">{section.note}</p>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
