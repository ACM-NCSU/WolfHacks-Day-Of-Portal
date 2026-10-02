import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import siteConfig from '../data/siteConfig.js';

const { tracks, challenges, judging } = siteConfig.event;

function AccordionItem({ title, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="faq__item">
      <button className="faq__summary" onClick={() => setIsOpen((v) => !v)} aria-expanded={isOpen}>
        {title}
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
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CriteriaList({ criteria }) {
  return (
    <dl className="tracks-page__criteria">
      {criteria.map((c) => (
        <div className="tracks-page__criteria-item" key={c.label}>
          <dt>{c.label}{c.weighted ? ' (weighted most)' : ''}</dt>
          <dd>{c.description}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function TracksPage() {
  return (
    <section>
      <div className="portal-shell__intro">
        <p className="eyebrow">TRACKS</p>
        <h1 className="section__heading">Pick a track, build something real.</h1>
        <p className="section__lede">
          Aim your project at one of these sponsor tracks. Set (or change) your team's track from
          the Team tab.
        </p>
      </div>

      <div className="faq__list">
        {tracks.map((track) => (
          <AccordionItem key={track.slug} title={track.name}>
            <p>{track.description}</p>

            {track.ideas && (
              <ul className="tracks-page__list">
                {track.ideas.map((idea) => (
                  <li key={idea}>{idea}</li>
                ))}
              </ul>
            )}

            {track.technologies && (
              <div className="team-chip-group team-chip-group--tags">
                {track.technologies.map((tech) => (
                  <span className="team-chip" key={tech}>{tech}</span>
                ))}
              </div>
            )}

            {track.datasets && <p><strong>Datasets:</strong> {track.datasets}</p>}
            {track.coreChallenge && <p><strong>Core challenge:</strong> {track.coreChallenge}</p>}
            {track.dataScienceComponent && (
              <p><strong>Data science component:</strong> {track.dataScienceComponent}</p>
            )}
          </AccordionItem>
        ))}
      </div>

      <div className="portal-shell__intro" style={{ marginTop: 40 }}>
        <p className="eyebrow">MLH PRIZES</p>
        <h2 className="section__heading">Go for bonus prizes.</h2>
        <p className="section__lede">
          On top of your track, your team can opt into as many of these MLH prize categories as
          you want. Each has one winning team. Opt in from the Team tab.
        </p>
      </div>

      <div className="faq__list">
        {challenges.map((prize) => (
          <AccordionItem key={prize.slug} title={prize.name}>
            <p><strong>Prize:</strong> {prize.prize}</p>
            <p>{prize.description}</p>
          </AccordionItem>
        ))}
      </div>

      <div className="portal-shell__intro" style={{ marginTop: 40 }}>
        <p className="eyebrow">JUDGING</p>
        <h2 className="section__heading">How projects are judged.</h2>
        <p className="section__lede">
          Every project is scored against the general criteria below. The Institute for Advanced
          Analytics track has its own additional rubric.
        </p>
      </div>

      <div className="faq__list">
        <AccordionItem title="General criteria">
          <CriteriaList criteria={judging.general} />
        </AccordionItem>
        <AccordionItem title="Institute for Advanced Analytics track criteria">
          <CriteriaList criteria={judging.iaa} />
        </AccordionItem>
      </div>
    </section>
  );
}
