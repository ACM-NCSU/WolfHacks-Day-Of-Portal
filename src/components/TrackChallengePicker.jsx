import { useState } from 'react';
import SelectField from './SelectField.jsx';
import siteConfig from '../data/siteConfig.js';
import { updateTeam } from '../lib/teamApi.js';

const { tracks, challenges } = siteConfig.event;
const KNOWN_CHALLENGE_SLUGS = new Set(challenges.map((c) => c.slug));

export default function TrackChallengePicker({ team, onTeamUpdate }) {
  const [error, setError] = useState('');
  const selectedTrack = tracks.find((t) => t.slug === team.track_slug);

  // Optimistic: show the change immediately, then reconcile with whatever
  // the PATCH actually returns (it's already the full updated team, so no
  // separate refetch is needed), or roll back to the pre-click team on error.
  async function setTrack(_name, trackName) {
    const track = tracks.find((t) => t.name === trackName);
    const nextSlug = track?.slug ?? null;
    const previous = team;
    setError('');
    onTeamUpdate({ ...team, track_slug: nextSlug });
    try {
      const updated = await updateTeam(team.id, { track_slug: nextSlug });
      onTeamUpdate(updated);
    } catch (err) {
      console.error(err);
      onTeamUpdate(previous);
      setError('Could not update the track. Please try again.');
    }
  }

  async function toggleChallenge(slug) {
    // Drop slugs no longer in siteConfig (e.g. retired placeholder
    // challenges) -- the backend rejects the whole list if any are unknown.
    const current = team.challenge_slugs.filter((s) => KNOWN_CHALLENGE_SLUGS.has(s));
    const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
    const previous = team;
    setError('');
    onTeamUpdate({ ...team, challenge_slugs: next });
    try {
      const updated = await updateTeam(team.id, { challenge_slugs: next });
      onTeamUpdate(updated);
    } catch (err) {
      console.error(err);
      onTeamUpdate(previous);
      setError('Could not update your MLH prizes. Please try again.');
    }
  }

  return (
    <div className="team-card">
      <p className="team-card__title">Track & MLH prizes</p>
      <label>
        <span className="application-form__question">Track</span>
        <SelectField
          name="track"
          value={selectedTrack?.name ?? ''}
          onChange={setTrack}
          placeholder="Select a track"
          options={tracks.map((t) => t.name)}
        />
      </label>
      <div className="team-picker__prizes">
        <span className="application-form__question">MLH prizes</span>
        <p className="team-card__note">Opt into as many as you want -- details are on the Tracks tab.</p>
      </div>
      <div className="team-chip-group">
        {challenges.map((challenge) => {
          const selected = team.challenge_slugs.includes(challenge.slug);
          return (
            <button
              key={challenge.slug}
              type="button"
              className={`team-chip ${selected ? 'team-chip--selected' : ''}`}
              onClick={() => toggleChallenge(challenge.slug)}
              aria-pressed={selected}
            >
              {challenge.name}
            </button>
          );
        })}
      </div>
      {error && <p className="team-card__error" role="alert">{error}</p>}
    </div>
  );
}
