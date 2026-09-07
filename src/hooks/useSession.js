import { useCallback, useEffect, useState } from 'react';
import { getSessionToken, setSessionToken } from '../lib/api.js';
import { login as apiLogin, me as apiMe } from '../lib/teamApi.js';

// Stub for #5 (real login). login() calls the temporary /api/auth/login
// (backend/auth_stub.py) -- there is no password and nothing beyond an
// itsdangerous-signed participant id. Swapping to real auth later means
// changing what login()/the mount effect call, not how consumers use this
// hook: { participant, status, login, logout }.
export default function useSession() {
  const [participant, setParticipant] = useState(null);
  const [status, setStatus] = useState('restoring'); // 'restoring' | 'anonymous' | 'authenticated'

  useEffect(() => {
    if (!getSessionToken()) {
      setStatus('anonymous');
      return;
    }
    apiMe()
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
    const { token, participant: found } = await apiLogin(email); // throws LoginError on failure -- caller renders the reason
    setSessionToken(token);
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
