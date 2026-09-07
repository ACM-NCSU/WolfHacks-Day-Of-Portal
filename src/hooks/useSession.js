import { useCallback, useEffect, useState } from 'react';
import { getSessionToken, setSessionToken } from '../lib/api.js';
import { mockLogin } from '../data/mockTeamState.js';

// Stub for #5 (real login). The "token" is just the participant's email --
// there is no password and nothing to verify server-side yet. Swapping to
// real auth later means changing what login()/the mount effect call, not
// how this hook's consumers use it: { participant, status, login, logout }.
export default function useSession() {
  const [participant, setParticipant] = useState(null);
  const [status, setStatus] = useState('restoring'); // 'restoring' | 'anonymous' | 'authenticated'

  useEffect(() => {
    const storedEmail = getSessionToken();
    if (!storedEmail) {
      setStatus('anonymous');
      return;
    }
    mockLogin(storedEmail)
      .then((found) => {
        setParticipant(found);
        setStatus('authenticated');
      })
      .catch(() => {
        setSessionToken('');
        setStatus('anonymous');
      });
  }, []);

  const login = useCallback(async (email) => {
    const found = await mockLogin(email); // throws LoginError on failure -- caller renders the reason
    setSessionToken(email);
    setParticipant(found);
    setStatus('authenticated');
    return found;
  }, []);

  const logout = useCallback(() => {
    setSessionToken('');
    setParticipant(null);
    setStatus('anonymous');
  }, []);

  return { participant, status, login, logout };
}
