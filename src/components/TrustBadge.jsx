import siteConfig from '../data/siteConfig.js';

export default function TrustBadge() {
  const { year, region, color } = siteConfig.event.trustBadge;

  const href = `https://mlh.io/seasons/${region}-${year}/events?utm_source=${region}-${year}&utm_medium=TrustBadge&utm_campaign=${region}-${year}&utm_content=${color}`;
  const src = `https://s3.amazonaws.com/logged-assets/trust-badge/${year}/${color}.svg`;

  return (
    <a id="mlh-trust-badge" href={href} target="_blank" rel="noreferrer">
      <img src={src} alt={`Major League Hacking ${year} Hackathon Season`} style={{ width: '100%' }} />
    </a>
  );
}
