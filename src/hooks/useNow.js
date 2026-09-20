import { useEffect, useState } from 'react';

const TICK_MS = 30_000;

// A ticking clock for computing "current" / "next" against schedule times --
// separate from useSchedule's data polling since this needs to advance even
// when the schedule itself hasn't changed.
export default function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return now;
}
