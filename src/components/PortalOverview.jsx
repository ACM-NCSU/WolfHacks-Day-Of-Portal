import Countdown from './Countdown.jsx';
import siteConfig from '../data/siteConfig.js';

const { event } = siteConfig;
const { dayOf } = event;

export default function PortalOverview() {
  return (
    <section className="overview">
      <div className="portal-shell__intro">
        <p className="eyebrow">TIME LEFT IN THE HACKATHON</p>
        <h1 className="section__heading">Keep building.</h1>
        <Countdown target={event.hackathonEndTarget} />
        <p className="portal-shell__placeholder-note" style={{ marginTop: 12 }}>
          Counts down to the Day 2 project submission deadline -- see the Schedule tab for the
          full agenda.
        </p>
      </div>

      <div className="team-card">
        <p className="team-card__title">Key deadlines</p>
        <dl className="overview-deadlines">
          {dayOf.deadlines.map((d) => (
            <div className="overview-deadlines__row" key={d.when}>
              <dt>{d.when}</dt>
              <dd>{d.what}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="portal-shell__intro">
        <p className="eyebrow">WHAT IS WOLFHACKS?</p>
        <h2 className="section__heading">{dayOf.tagline}</h2>
        <p className="section__lede">{event.hero.subhead}</p>
      </div>
      <ul className="overview-highlights">
        {dayOf.highlights.map((h) => (
          <li className="overview-highlights__item" key={h}>{h}</li>
        ))}
      </ul>

      <div className="portal-shell__intro">
        <p className="eyebrow">START TO FINISH</p>
        <h2 className="section__heading">Your weekend, step by step.</h2>
      </div>
      <div className="team-card">
        <ol className="overview-roadmap">
          {dayOf.roadmap.map((step) => (
            <li key={step.title}>
              <strong>{step.title}.</strong> {step.text}
            </li>
          ))}
        </ol>
      </div>

      <div className="portal-shell__intro">
        <p className="eyebrow">RULES</p>
        <h2 className="section__heading">The ground rules.</h2>
      </div>
      <div className="team-card">
        <ul className="tracks-page__list overview-rules">
          {dayOf.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      <div className="portal-shell__intro">
        <p className="eyebrow">MAIN COMPETITIONS</p>
        <h2 className="section__heading">One overall winner each.</h2>
        <p className="section__lede">
          On top of track prizes and MLH prizes (see the Tracks tab), every team competes in one of
          these.
        </p>
      </div>
      <div className="overview-competitions">
        {dayOf.competitions.map((c) => (
          <div className="team-card overview-competitions__card" key={c.name}>
            <p className="team-card__title">{c.name}</p>
            <p className="team-card__note">{c.eligibility}</p>
            <p className="overview-competitions__prize">Prize: {c.prize}</p>
          </div>
        ))}
      </div>

      <div className="portal-shell__intro">
        <p className="eyebrow">WHO&apos;S WHO</p>
        <h2 className="section__heading">Spot our staff.</h2>
      </div>
      <div className="team-card">
        <ul className="overview-staff">
          {dayOf.staff.map((s) => (
            <li key={s.who}>
              <span className="overview-staff__swatch" style={{ background: s.swatch }} aria-hidden="true" />
              <span className="overview-staff__look">{s.look}</span>
              <span className="overview-staff__who">{s.who}</span>
            </li>
          ))}
        </ul>
        <p className="team-card__note">Got a question? Find us at the help desk!</p>
      </div>

      <div className="team-card">
        <p className="team-card__title">Resources to know</p>
        <ul className="tracks-page__list">
          {dayOf.resources.map((r) => (
            <li key={r.name}>
              <strong>{r.name}</strong> -- {r.what}
            </li>
          ))}
        </ul>
      </div>

      <div className="team-card">
        <p className="team-card__title">Venue &amp; parking</p>
        <p className="team-card__note">
          {event.location}, inside the James B. Hunt Jr. Library on NC State&apos;s Centennial Campus.
          Parking is free on Centennial Campus from 5 PM Friday to 7 AM Monday.
        </p>
      </div>

      <div className="team-card">
        <p className="team-card__title">Need help?</p>
        <p className="team-card__note">
          Look for staff in WolfHacks shirts, stop by the help desk, ask in the event Discord, or
          email <a href="mailto:acmchapter-org@ncsu.edu">acmchapter-org@ncsu.edu</a>.
        </p>
      </div>

      <div className="team-card">
        <p className="team-card__title">Code of conduct</p>
        <p className="team-card__note">
          WolfHacks follows the{' '}
          <a href={event.codeOfConduct} target="_blank" rel="noreferrer">
            MLH Code of Conduct
          </a>
          . Report any concerns to a staff member immediately.
        </p>
      </div>

      <div className="team-card">
        <p className="team-card__title">Thank you to our sponsors</p>
        <p className="team-card__note">{dayOf.sponsors.join(' · ')}</p>
        <p className="team-card__title overview-partners-title">And ACM&apos;s corporate partners</p>
        <p className="team-card__note">{dayOf.acmPartners.join(' · ')}</p>
      </div>
    </section>
  );
}
