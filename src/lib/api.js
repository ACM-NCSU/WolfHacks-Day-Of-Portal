import { supabase } from './supabase.js';

// Single source of truth for talking to the FastAPI backend.
export const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

export class ApiError extends Error {
  constructor(message, { status, detail } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? '';
}

// Thin wrapper around fetch: resolves the API base, attaches the current
// Supabase session's access token, JSON-encodes a body object automatically,
// and throws ApiError on a non-2xx response so callers can use a single
// try/catch instead of checking response.ok everywhere.
export async function apiFetch(path, { method = 'GET', body, headers = {}, ...rest } = {}) {
  const token = await getAccessToken();
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
