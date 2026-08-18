import { useEffect, useState } from 'react';

function pad(n) {
  return String(n).padStart(2, '0');
}

function diffToParts(target) {
  const diff = Math.max(0, target - Date.now());
  return {
    days: pad(Math.floor(diff / 86400000)),
    hours: pad(Math.floor((diff % 86400000) / 3600000)),
    mins: pad(Math.floor((diff % 3600000) / 60000)),
    secs: pad(Math.floor((diff % 60000) / 1000)),
  };
}

export default function useCountdown(targetDateString) {
  const target = new Date(targetDateString).getTime();
  const [parts, setParts] = useState(() => (isNaN(target) ? null : diffToParts(target)));

  useEffect(() => {
    if (isNaN(target)) return undefined;

    setParts(diffToParts(target));
    const id = setInterval(() => setParts(diffToParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return parts;
}
