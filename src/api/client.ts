import { supabase } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export { API_BASE };

// Cache the latest access token so apiFetch never has to call getSession()
// from inside an onAuthStateChange callback (which can return null in Supabase v2
// due to internal session locking while a state transition is in progress).
let _cachedAccessToken: string | null = null;
const AUTH_ME_PATH = '/api/auth/me';

supabase.auth.getSession().then(({ data: { session } }) => {
  _cachedAccessToken = session?.access_token ?? null;
});

supabase.auth.onAuthStateChange((_event, session) => {
  _cachedAccessToken = session?.access_token ?? null;
});

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  if (DEMO_MODE) {
    const { buildMockResponse } = await import('./demo');
    return buildMockResponse(path) as T;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Scout PIN-auth sessions use a server-issued JWT stored in localStorage
  const scoutToken = localStorage.getItem('scout_token');
  let supabaseSessionExists = false;
  let accessTokenExists = false;

  if (scoutToken) {
    headers.Authorization = `Bearer ${scoutToken}`;
  } else {
    let accessToken = _cachedAccessToken;

    if (!accessToken) {
      const { data: { session } } = await supabase.auth.getSession();
      supabaseSessionExists = Boolean(session);
      accessTokenExists = Boolean(session?.access_token);
      accessToken = session?.access_token ?? null;
      _cachedAccessToken = accessToken;
    } else {
      supabaseSessionExists = true;
      accessTokenExists = true;
    }

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  if (import.meta.env.DEV && path === AUTH_ME_PATH) {
    console.debug('[AUTH DIAG] apiFetch auth header', {
      path,
      sessionExists: supabaseSessionExists,
      accessTokenExists,
      hasAuthorizationHeader: Boolean(headers.Authorization),
    });
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const errMsg = (data && typeof data === 'object' && 'error' in data) ? String((data as { error: unknown }).error) : response.statusText;
    throw new Error(errMsg);
  }
  return response.json();
}
