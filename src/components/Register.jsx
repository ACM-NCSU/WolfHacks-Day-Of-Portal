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

export default function Register() {
  const { event } = siteConfig;
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="section register" id="apply">
      <div className="container">
        <motion.div
          variants={container}
          initial={prefersReducedMotion ? 'show' : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '0px 0px -10% 0px', amount: 0.3 }}
        >
          <motion.p variants={item} className="eyebrow">
            REGISTRATION
          </motion.p>

          <motion.h2 variants={item} className="section__heading">
            Interested?
          </motion.h2>

          <motion.p variants={item} className="section__lede">
            {event.hero.registerNote}
          </motion.p>

          <motion.div variants={item} className="register__actions">
            <motion.a
              className="btn btn--primary"
              href={event.hero.preRegisterUrl}
              target="_blank"
              rel="noreferrer"
              whileHover={prefersReducedMotion ? undefined : { y: -2, boxShadow: '0 6px 18px rgba(200, 16, 46, 0.45)' }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              Pre-register
            </motion.a>
          </motion.div>

          <motion.a variants={item} href="#faq" className="scroll-cue">
            Got questions? See the FAQ
            <span className="scroll-cue__arrow" aria-hidden="true">&darr;</span>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
