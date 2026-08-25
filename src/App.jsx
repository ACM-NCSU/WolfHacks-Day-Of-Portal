import { Analytics } from '@vercel/analytics/react';
import Starfield from './components/Starfield.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import Hero from './components/Hero.jsx';
import Register from './components/Register.jsx';
import Faq from './components/Faq.jsx';
import Footer from './components/Footer.jsx';
import ApplyPage from './components/ApplyPage.jsx';
import ThankYouPage from './components/ThankYouPage.jsx';

export default function App() {
  const pathname = window.location.pathname.replace(/\/$/, '');

  if (pathname === '/apply') {
    return <ApplyPage />;
  }

  if (pathname === '/thank-you') {
    return <ThankYouPage />;
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
