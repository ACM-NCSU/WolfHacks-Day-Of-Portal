import { motion } from 'framer-motion';
import ThemeToggle from './ThemeToggle.jsx';
import Starfield from './Starfield.jsx';

export default function ThankYouPage() {
  return (
    <>
      <Starfield />
      <ThemeToggle />
      <main className="apply-page">
        <div className="container apply-page__container">
          <motion.section
            className="apply-success"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="eyebrow">REGISTRATION COMPLETE</p>
            <h1 className="section__heading">Thank you so much for registering!</h1>
            <p className="section__lede">Your application has been received. We&apos;ll be in touch with next steps.</p>
            <a href="/" className="btn btn--primary">Return Home</a>
          </motion.section>
        </div>
      </main>
    </>
  );
}
