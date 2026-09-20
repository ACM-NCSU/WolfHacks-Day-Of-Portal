import { useCallback, useEffect, useState } from 'react';
import { listAnnouncements } from '../lib/announcementsApi.js';

const POLL_INTERVAL_MS = 20_000;

// Polls on a timer rather than a realtime subscription (no backend push
// channel exists yet) so a page left open still picks up new broadcasts.
export default function useAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  const refresh = useCallback(async () => {
    try {
      const next = await listAnnouncements();
      setAnnouncements(next);
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { announcements, status, refresh };
}
