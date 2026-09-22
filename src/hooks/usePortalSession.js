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
export default function usePortalSession() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'anonymous' | 'authenticated'
  const [participant, setParticipant] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
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
        await supabase.auth.signOut();
        if (!cancelled) {
          setStatus('anonymous');
          navigate(
            response.status === 403 ? '/portal/login?error=not_registered' : '/portal/login',
            { replace: true },
          );
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
