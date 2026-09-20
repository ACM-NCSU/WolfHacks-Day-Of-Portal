import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) {
          setStatus('anonymous');
          window.location.href = '/portal/login';
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
          window.location.href = response.status === 403
            ? '/portal/login?error=not_registered'
            : '/portal/login';
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
  }, []);

  const login = useCallback(() => {
    window.location.href = '/portal/login';
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/portal/login';
  }, []);

  return { participant, status, login, logout };
}
