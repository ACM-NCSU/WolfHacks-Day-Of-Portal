import { useCallback, useEffect, useRef, useState } from 'react';
import { getMyState } from '../lib/teamApi.js';

const POLL_INTERVAL_MS = 10000;

// Live updates are done by polling GET /api/team/me on a timer rather than
// Supabase Realtime (see plan.md TD-26) -- no anon DB access needed for it.
// The "always re-fetch, never trust a push payload" pattern is rehearsed
// here already: every mutation elsewhere calls refresh() itself rather than
// trusting its own response, which is what makes plain polling a drop-in fit.
export default function useTeamState(participant) {
  const [team, setTeam] = useState(null);
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [outgoingInvites, setOutgoingInvites] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  // Tracks whether the *first* load for this participant has finished, so a
  // refresh triggered by an action (create/invite/accept/leave) doesn't blank
  // the whole screen back to a loading message -- only the initial mount does.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Guards against an in-flight request's response landing after a newer
  // one's -- now that refresh() also fires on a timer, two can overlap.
  const requestSeq = useRef(0);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    // Bumped unconditionally, including the reset-on-logout path below --
    // otherwise a request issued before a session switch can still equal
    // requestSeq.current after the switch, and a late response from the
    // PREVIOUS participant can pass the staleness check and get rendered
    // under the NEW one.
    const seq = ++requestSeq.current;
    if (!participant) {
      setTeam(null);
      setIncomingInvites([]);
      setOutgoingInvites([]);
      setStatus('idle');
      setHasLoadedOnce(false);
      return;
    }
    // Background polling passes silent so the UI doesn't flash back to a
    // loading state every 10 seconds -- only the initial load and explicit
    // user actions (create/invite/accept/leave) show it.
    if (!silent) setStatus('loading');
    try {
      const next = await getMyState();
      if (seq !== requestSeq.current) return; // superseded by a later call
      setTeam(next.team);
      setIncomingInvites(next.incomingInvites);
      setOutgoingInvites(next.outgoingInvites);
      setStatus('ready');
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load team state:', err);
      setStatus('error');
    } finally {
      if (seq === requestSeq.current) setHasLoadedOnce(true);
    }
  }, [participant]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!participant) return undefined;

    const poll = () => {
      // Skip while backgrounded; a focus regain below catches it up instead
      // of burning requests on a tab nobody's looking at.
      if (!document.hidden) refresh({ silent: true });
    };
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', poll);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [participant, refresh]);

  // Mirrors the participant the current render belongs to -- assigned
  // during render, not in an effect, so it's never a frame behind.
  const ownerId = participant?.id ?? null;
  const currentOwner = useRef(ownerId);
  currentOwner.current = ownerId;

  // Lets a mutation's own response (e.g. the team PATCH returns) update
  // state directly instead of triggering a full refresh() refetch. These
  // need the same two guarantees refresh() already has: drop the write if
  // the session changed while the request was in flight (the setter closes
  // over the participant active when it was created), and bump requestSeq
  // so an older poll still in flight can't overwrite the fresher value we
  // just applied locally.
  const ownedSetTeam = useCallback((value) => {
    if (currentOwner.current !== ownerId) return;
    requestSeq.current += 1;
    setTeam(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);
  const ownedSetIncomingInvites = useCallback((value) => {
    if (currentOwner.current !== ownerId) return;
    requestSeq.current += 1;
    setIncomingInvites(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);
  const ownedSetOutgoingInvites = useCallback((value) => {
    if (currentOwner.current !== ownerId) return;
    requestSeq.current += 1;
    setOutgoingInvites(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  return {
    team,
    incomingInvites,
    outgoingInvites,
    status,
    hasLoadedOnce,
    refresh,
    setTeam: ownedSetTeam,
    setIncomingInvites: ownedSetIncomingInvites,
    setOutgoingInvites: ownedSetOutgoingInvites,
  };
}
