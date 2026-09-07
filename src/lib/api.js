// Single source of truth for talking to the FastAPI backend. Was previously
// duplicated per-component (ApplyPage.jsx's old API_URL constant) --
// centralized here now that a second caller (the team dashboard) exists.
export const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

const SESSION_TOKEN_KEY = 'wolfhacks_session_token';

export function getSessionToken() {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY) ?? '';
  } catch {
    // localStorage can throw in private-browsing / storage-blocked contexts.
    return '';
  }
}

export function setSessionToken(token) {
  try {
    if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
    else localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Nothing we can do if storage is unavailable; the session just won't persist.
  }
}

export class ApiError extends Error {
  constructor(message, { status, detail } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

// Thin wrapper around fetch: resolves the API base, attaches the session
// token (once auth exists -- see backend/auth_stub.py), JSON-encodes a body
// object automatically, and throws ApiError on a non-2xx response so callers
// can use a single try/catch instead of checking response.ok everywhere.
export async function apiFetch(path, { method = 'GET', body, headers = {}, ...rest } = {}) {
  const token = getSessionToken();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail;
    console.error(`API request failed: ${method} ${path}`, response.status, detail);
    throw new ApiError(typeof detail === 'string' ? detail : 'Request failed', {
      status: response.status,
      detail,
    });
  }

  if (response.status === 204) return null;
  return response.json().catch(() => null);
}
