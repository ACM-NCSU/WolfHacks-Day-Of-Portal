import { useCallback, useEffect, useState } from 'react';
import { getMyState } from '../lib/teamApi.js';

// TD-23 adds a Supabase Realtime subscription that calls refresh() on any
// change -- the "realtime is only a ping, always re-fetch" pattern is
// rehearsed here already: every mutation elsewhere calls refresh() itself
// rather than trusting its own response.
export default function useTeamState(participant) {
  const [team, setTeam] = useState(null);
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [outgoingInvites, setOutgoingInvites] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  // Tracks whether the *first* load for this participant has finished, so a
  // refresh triggered by an action (create/invite/accept/leave) doesn't blank
  // the whole screen back to a loading message -- only the initial mount does.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const refresh = useCallback(async () => {
    if (!participant) {
      setTeam(null);
      setIncomingInvites([]);
      setOutgoingInvites([]);
      setStatus('idle');
      setHasLoadedOnce(false);
      return;
    }
    setStatus('loading');
    try {
      const next = await getMyState();
      setTeam(next.team);
      setIncomingInvites(next.incomingInvites);
      setOutgoingInvites(next.outgoingInvites);
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load team state:', err);
      setStatus('error');
    } finally {
      setHasLoadedOnce(true);
    }
  }, [participant]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { team, incomingInvites, outgoingInvites, status, hasLoadedOnce, refresh };
}
