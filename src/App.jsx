import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Starfield from './components/Starfield.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import Hero from './components/Hero.jsx';
import Register from './components/Register.jsx';
import Faq from './components/Faq.jsx';
import Footer from './components/Footer.jsx';
import ApplyPage from './components/ApplyPage.jsx';
import ThankYouPage from './components/ThankYouPage.jsx';
import PortalShell, { PortalOverview, PortalSection } from './components/PortalShell.jsx';
import PortalLogin from './pages/PortalLogin.jsx';
import OrganizerPortal from './pages/OrganizerPortal.jsx';
import UpdatePassword from './pages/UpdatePassword.jsx';

function LandingPage() {
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

export default function App() {
  return (
    <Routes>
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/thank-you" element={<ThankYouPage />} />
      {/* Check-in and the team dashboard are now portal sections, not
          standalone pages -- redirect anyone with an old URL bookmarked. */}
      <Route path="/checkin" element={<Navigate to="/portal/checkin" replace />} />
      <Route path="/team" element={<Navigate to="/portal/team" replace />} />
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/organizer" element={<OrganizerPortal />} />
      <Route path="/portal/setup-request" element={<UpdatePassword />} />
      {/* Nested under one layout route so PortalShell (and the session it
          holds via usePortalSession) mounts once and stays mounted while
          navigating between sections -- only the Outlet content below swaps.
          A flat ":sectionId?" route looked equivalent but empirically still
          remounted on every param change, re-running the auth check. */}
      <Route path="/portal" element={<PortalShell />}>
        <Route index element={<PortalOverview />} />
        <Route path=":sectionId" element={<PortalSection />} />
      </Route>
      <Route path="/" element={<LandingPage />} />
    </Routes>
  );
}
