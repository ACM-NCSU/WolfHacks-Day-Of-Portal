import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Backs PortalShell with the real Supabase session. Anonymous visitors are
// bounced to /portal/login before any portal content renders. Organizers/
// admins land in the same shell as hackers -- their extra controls (editing
// the schedule, posting announcements) are gated inline by participant.is_organizer
// within each section, not by a separate page. Shape --
// { participant, status, login, logout } -- matches the placeholder this
// replaces, plus a 'loading' status while the session/role check is in flight.
// Local-only escape hatch for when Discord OAuth's redirect can't point at
// both localhost and the deployed domain at once (Supabase's Site URL is a
// single value). Gated on import.meta.env.DEV so it's dead in a production
// build even if VITE_SKIP_AUTH somehow leaked into a deployed env, and on an
// explicit opt-in flag so real local auth testing still works by default.
// Remove once the portal has its own local Supabase instance instead of
// sharing the deployed one -- see .env.example.
const SKIP_AUTH = import.meta.env.DEV && import.meta.env.VITE_SKIP_AUTH === 'true';
const SKIP_AUTH_PARTICIPANT = {
  id: 'dev-skip-auth',
  full_name: 'Dev User',
  email: 'dev@localhost',
  role: import.meta.env.VITE_SKIP_AUTH_ROLE || 'hacker',
  is_organizer: (import.meta.env.VITE_SKIP_AUTH_ROLE || 'hacker') === 'organizer',
  checked_in: true,
};

export default function usePortalSession() {
  const [status, setStatus] = useState(SKIP_AUTH ? 'authenticated' : 'loading'); // 'loading' | 'anonymous' | 'authenticated'
  const [participant, setParticipant] = useState(SKIP_AUTH ? SKIP_AUTH_PARTICIPANT : null);
  const navigate = useNavigate();

  useEffect(() => {
    if (SKIP_AUTH) {
      // eslint-disable-next-line no-console
      console.warn('[usePortalSession] VITE_SKIP_AUTH is on -- using a fake participant, not real auth.');
      return;
    }

    let cancelled = false;

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) {
          setStatus('anonymous');
          navigate('/portal/login', { replace: true });
        }
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        // The backend 403s for two different reasons -- never applied, or
        // applied but not checked in at the desk yet -- and they need very
        // different messages on the login page.
        let errorParam = '';
        if (response.status === 403) {
          const payload = await response.json().catch(() => null);
          const detail = typeof payload?.detail === 'string' ? payload.detail : '';
          errorParam = detail.toLowerCase().includes('check in') ? 'not_checked_in' : 'not_registered';
        }
        await supabase.auth.signOut();
        if (!cancelled) {
          setStatus('anonymous');
          navigate(errorParam ? `/portal/login?error=${errorParam}` : '/portal/login', { replace: true });
        }
        return;
      }

      const data = await response.json();

      if (!cancelled) {
        setParticipant({
          id: data.user_id,
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          is_organizer: data.role === 'organizer' || data.role === 'admin',
          checked_in: data.checked_in,
        });
        setStatus('authenticated');
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
    // navigate deliberately excluded: react-router-dom's useNavigate() returns a
    // new function identity on every route change, and including it here would
    // re-run this session/auth check (a real network round trip) on every portal
    // navigation instead of once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(() => {
    navigate('/portal/login');
  }, [navigate]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/portal/login');
  }, [navigate]);

  return { participant, status, login, logout };
}
