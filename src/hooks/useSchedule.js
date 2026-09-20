import { useCallback, useEffect, useState } from 'react';
import { listSchedule } from '../lib/scheduleApi.js';

const POLL_INTERVAL_MS = 15_000;

// Public feed, same "poll on a timer, no push channel yet" shape as
// useAnnouncements -- an organizer's edit lands for every open tab within
// one interval instead of needing a manual refresh.
export default function useSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  const refresh = useCallback(async () => {
    try {
      const next = await listSchedule();
      setSchedule(next);
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load schedule:', err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { schedule, status, refresh };
}
