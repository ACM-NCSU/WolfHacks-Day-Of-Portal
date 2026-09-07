import { useState } from 'react';
import SelectField from './SelectField.jsx';
import siteConfig from '../data/siteConfig.js';
import { mockUpdateTeam } from '../data/mockTeamState.js';

const { tracks, challenges } = siteConfig.event;

export default function TrackChallengePicker({ team, onChanged }) {
  const [error, setError] = useState('');
  const selectedTrack = tracks.find((t) => t.slug === team.track_slug);

  async function setTrack(_name, trackName) {
    const track = tracks.find((t) => t.name === trackName);
    setError('');
    try {
      await mockUpdateTeam(team.id, { track_slug: track?.slug ?? null });
      await onChanged();
    } catch (err) {
      console.error(err);
      setError('Could not update the track. Please try again.');
    }
  }

  async function toggleChallenge(slug) {
    const next = team.challenge_slugs.includes(slug)
      ? team.challenge_slugs.filter((s) => s !== slug)
      : [...team.challenge_slugs, slug];
    setError('');
    try {
      await mockUpdateTeam(team.id, { challenge_slugs: next });
      await onChanged();
    } catch (err) {
      console.error(err);
      setError('Could not update challenges. Please try again.');
    }
  }

  return (
    <div className="team-card">
      <p className="team-card__title">Track & challenges</p>
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
