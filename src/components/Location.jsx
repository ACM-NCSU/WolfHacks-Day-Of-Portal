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

export default function Location() {
  const { event } = siteConfig;
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="section location" id="location">
      <div className="container">
        <motion.div
          variants={container}
          initial={prefersReducedMotion ? 'show' : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '0px 0px -10% 0px', amount: 0.3 }}
        >
          <motion.p variants={item} className="eyebrow">
            LOCATION
          </motion.p>

          <motion.h2 variants={item} className="section__heading">
            Duke Energy Hall
          </motion.h2>

          <motion.p variants={item} className="section__lede">
            Join us in person at NC State University for {event.name}! We'll be in Duke Energy Hall, which is inside Hunt Library.
          </motion.p>

          <motion.div variants={item} className="location__map-wrap">
            <iframe
            title="WolfHacks Event Location Map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d437.45751001207196!2d-78.67663554013411!3d35.76920978387624!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89acf5759f591f41%3A0xbe0266269ce37f59!2sJames%20B.%20Hunt%20Jr.%20Library!5e0!3m2!1sen!2sus!4v1787167462354!5m2!1sen!2sus"
            width="100%"
            height="400"
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
