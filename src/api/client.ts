import { supabase } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const SCOUT_API_BASE = import.meta.env.VITE_SCOUT_API_BASE || 'http://localhost:3001';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export { API_BASE, SCOUT_API_BASE };

if (import.meta.env.DEV) {
  console.debug('[api] API_BASE:', API_BASE, 'SCOUT_API_BASE:', SCOUT_API_BASE, DEMO_MODE ? '(demo mode)' : '');
}

// Cache the latest Supabase access token so apiFetch never has to call getSession()
// from inside an onAuthStateChange callback (which can return null in Supabase v2
// due to internal session locking while a state transition is in progress).
let _cachedAccessToken: string | null = null;

if (!DEMO_MODE) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    _cachedAccessToken = session?.access_token ?? null;
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    _cachedAccessToken = session?.access_token ?? null;
  });
}

// Main app client — hits VITE_API_BASE, sends Supabase JWT only. Never sends scout_token.
export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  if (DEMO_MODE) {
    const { buildMockResponse } = await import('./demo');
    return buildMockResponse(path) as T;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  let accessToken = _cachedAccessToken;

  if (!accessToken) {
    const { data: { session } } = await supabase.auth.getSession();
    accessToken = session?.access_token ?? null;
    _cachedAccessToken = accessToken;
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const url = `${API_BASE}${path}`;
  console.log('[apiFetch]', options.method || 'GET', url, '| auth:', accessToken ? 'supabase-jwt' : 'none');

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const errMsg = (data && typeof data === 'object' && 'error' in data) ? String((data as { error: unknown }).error) : response.statusText;
    console.warn('[apiFetch] error', response.status, url, errMsg);
    throw new Error(errMsg);
  }
  return response.json();
}

// Scout client — hits VITE_SCOUT_API_BASE, sends scout_token. Never sends Supabase JWT.
export async function scoutFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const scoutToken = localStorage.getItem('scout_token');
  if (scoutToken) {
    headers.Authorization = `Bearer ${scoutToken}`;
  }

  const url = `${SCOUT_API_BASE}${path}`;
  console.log('[scoutFetch]', options.method || 'GET', url, '| auth:', scoutToken ? 'scout-jwt' : 'none');

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const errMsg = (data && typeof data === 'object' && 'error' in data) ? String((data as { error: unknown }).error) : response.statusText;
    throw new Error(errMsg);
  }
  return response.json();
}
