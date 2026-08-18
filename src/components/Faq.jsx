import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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

function FaqItem({ item, index }) {
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="faq__item"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px', amount: 0.2 }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.06 }}
    >
      <button className="faq__summary" onClick={() => setIsOpen((v) => !v)} aria-expanded={isOpen}>
        {item.question}
        <motion.span
          className="faq__toggle"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          +
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="faq__answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <p>
              {item.link ? (
                <>
                  {item.answerBefore}
                  <a className="acm-mention" href={item.link.url} target="_blank" rel="noreferrer">
                    {item.link.text}
                  </a>
                  {item.answerAfter}
                </>
              ) : (
                item.answer
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Faq() {
  const { faq } = siteConfig.event;
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="section faq" id="faq">
      <div className="container">
        <motion.div
          variants={container}
          initial={prefersReducedMotion ? 'show' : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '0px 0px -10% 0px', amount: 0.3 }}
        >
          <motion.p variants={item} className="eyebrow">
            {faq.eyebrow}
          </motion.p>
          <motion.h2 variants={item} className="section__heading">
            {faq.heading}
          </motion.h2>
        </motion.div>

        <div className="faq__list">
          {faq.items.map((faqItem, index) => (
            <FaqItem key={faqItem.question} item={faqItem} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
