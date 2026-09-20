import { Analytics } from '@vercel/analytics/react';
import Starfield from './components/Starfield.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import Hero from './components/Hero.jsx';
import Register from './components/Register.jsx';
import Faq from './components/Faq.jsx';
import Footer from './components/Footer.jsx';
import ApplyPage from './components/ApplyPage.jsx';
import ThankYouPage from './components/ThankYouPage.jsx';
import PortalShell from './components/PortalShell.jsx';
import PortalLogin from './pages/PortalLogin.jsx';
import OrganizerPortal from './pages/OrganizerPortal.jsx';
import UpdatePassword from './pages/UpdatePassword.jsx';
import CheckInPage from './pages/CheckInPage.jsx';
import PORTAL_SECTIONS from './data/portalSections.js';

export default function App() {
  const pathname = window.location.pathname.replace(/\/$/, '');

  if (pathname === '/apply') {
    return <ApplyPage />;
  }

  if (pathname === '/thank-you') {
    return <ThankYouPage />;
  }

  if (pathname === '/checkin') {
    return <CheckInPage />;
  }

  if (pathname === '/portal/login') {
    return <PortalLogin />;
  }

  if (pathname === '/portal/organizer') {
    return <OrganizerPortal />;
  }

  if (pathname === '/portal/setup-request') {
    return <UpdatePassword />;
  }

  if (pathname === '/portal') {
    return <PortalShell />;
  }

  const portalSection = PORTAL_SECTIONS.find((section) => section.path === pathname);
  if (portalSection) {
    return <PortalShell sectionId={portalSection.id} />;
  }

  return (
    <>
      <Starfield />
      <div className="site-glow" aria-hidden="true" />
      <ThemeToggle />
      <Hero />
      <Register />
      <Faq />
      <Footer />
      <Analytics />
    </>
  );
}
