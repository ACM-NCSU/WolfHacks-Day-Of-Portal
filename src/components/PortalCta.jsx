import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import siteConfig from '../data/siteConfig.js';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

// Replaces the registration CTA -- hacker registration is closed, and once
// the event is underway none of that copy matters anymore. This is the
// site's main entry point into the day-of portal instead.
export default function PortalCta() {
  const { event } = siteConfig;
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="section portal-cta" id="portal">
      <div className="container">
        <motion.div
          variants={container}
          initial={prefersReducedMotion ? 'show' : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '0px 0px -10% 0px', amount: 0.3 }}
        >
          <motion.p variants={item} className="eyebrow">
            DAY OF THE EVENT
          </motion.p>

          <motion.h2 variants={item} className="section__heading">
            Head to the Portal
          </motion.h2>

          <motion.p variants={item} className="section__lede">
            Check-in, the live schedule, your team, and announcements all live in the {event.name} Day-Of Portal.
          </motion.p>

          <motion.div variants={item} className="portal-cta__actions">
            <motion.div
              whileHover={prefersReducedMotion ? undefined : { y: -2, boxShadow: '0 6px 18px rgba(200, 16, 46, 0.45)' }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              <Link className="btn btn--primary" to="/portal">
                Go to Portal
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
