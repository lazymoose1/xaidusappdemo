import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { normalizeArchetype, DEFAULT_ARCHETYPE } from '@/lib/archetypes';
import type { ApiUser } from '@/types/api';
import { authApi, scoutAuthApi } from '@/api/endpoints';

const SCOUT_TOKEN_KEY = 'scout_token';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export type ProfileStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface AuthContextType {
  user: ApiUser | null;
  session: Session | null;
  loading: boolean;
  profileStatus: ProfileStatus;
  retryProfile: () => void;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signUpParent: (email: string, password: string, displayName?: string, childName?: string) => Promise<{ error: Error | null }>;
  signUpLeader: (email: string, password: string, displayName?: string, leaderInviteCode?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  scoutSignIn: (troopCode: string, nickname: string, pin: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const createDemoUser = (role: string = 'teen', displayName?: string): ApiUser => ({
  id: `${role}-demo-user`,
  role,
  displayName: displayName || 'Demo User',
  archetype: normalizeArchetype(DEFAULT_ARCHETYPE),
  interests: ['learning', 'creativity'],
  isScoutAccount: false,
  isScoutMember: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // profileStatus is separate from loading — loading covers the initial session check,
  // profileStatus covers the async backend profile fetch that follows.
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle');

  // Fetch the real profile from the backend. Never infers a role — only sets user
  // once the backend confirms it. On failure, sets error state instead of a fallback.
  const fetchProfile = useCallback(async (): Promise<void> => {
    setProfileStatus('loading');
    try {
      const data = await authApi.getMe();
      setUser({ ...data, archetype: normalizeArchetype(data?.archetype) });
      setProfileStatus('loaded');
    } catch {
      setUser(null);
      setProfileStatus('error');
    }
  }, []);

  // Safety net: release the loading gate after 10 s so users are never permanently stuck.
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 10_000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      setUser(createDemoUser());
      setProfileStatus('loaded');
      setLoading(false);
      return;
    }

    // Scout PIN-auth sessions use a server-issued JWT stored in localStorage —
    // they have no Supabase session, so handle them before the Supabase path.
    const scoutToken = localStorage.getItem(SCOUT_TOKEN_KEY);
    if (scoutToken) {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      );
      Promise.race([authApi.getMe(), timeout]).then((profile) => {
        setUser({ ...profile, archetype: normalizeArchetype((profile as any)?.archetype) });
        setProfileStatus('loaded');
        setLoading(false);
      }).catch(() => {
        localStorage.removeItem(SCOUT_TOKEN_KEY);
        setProfileStatus('idle');
        setLoading(false);
      });
      return;
    }

    // Supabase path (teens, parents, leaders).
    // getSession() resolves the initial auth state; loading becomes false after it.
    // Profile fetch is a separate async step tracked by profileStatus.
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setLoading(false);
      if (import.meta.env.DEV) {
        console.debug('[AUTH DIAG] AuthProvider initial session resolved', {
          hasSession: Boolean(initialSession),
          accessTokenExists: Boolean(initialSession?.access_token),
        });
      }
      if (initialSession) {
        fetchProfile();
      }
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      // INITIAL_SESSION duplicates what getSession() already handled above — skip it.
      if (event === 'INITIAL_SESSION') return;

      setSession(newSession);
      if (import.meta.env.DEV && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT')) {
        console.debug('[AUTH DIAG] AuthProvider auth state change', {
          event,
          hasSession: Boolean(newSession),
          accessTokenExists: Boolean(newSession?.access_token),
        });
      }

      if (event === 'SIGNED_OUT' || !newSession) {
        setUser(null);
        setProfileStatus('idle');
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        // Token silently refreshed — the user's identity hasn't changed.
        // Preserve the loaded profile; do not re-fetch or overwrite role.
        return;
      }

      // SIGNED_IN (and any other event that carries a new session).
      // Clear any stale profile and fetch the real one from the backend.
      setUser(null);
      fetchProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  const retryProfile = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, displayName?: string): Promise<{ error: Error | null }> => {
    if (DEMO_MODE) {
      setUser(createDemoUser('teen', displayName));
      setProfileStatus('loaded');
      return { error: null };
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    try {
      const profile = await authApi.registerProfile({ displayName, role: 'teen' });
      setUser({ ...profile, archetype: normalizeArchetype(profile?.archetype) });
      setProfileStatus('loaded');
    } catch (err) {
      console.warn('Profile registration failed after signup:', err);
    }
    return { error: null };
  };

  const signUpParent = async (email: string, password: string, displayName?: string, childName?: string): Promise<{ error: Error | null }> => {
    if (DEMO_MODE) {
      setUser(createDemoUser('parent', displayName));
      setProfileStatus('loaded');
      return { error: null };
    }
    localStorage.removeItem(SCOUT_TOKEN_KEY);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    try {
      const profile = await authApi.registerProfile({ displayName, role: 'parent', childName });
      setUser({ ...profile, archetype: normalizeArchetype(profile?.archetype) });
      setProfileStatus('loaded');
    } catch (err) {
      console.warn('Profile registration failed after parent signup:', err);
    }
    return { error: null };
  };

  const signUpLeader = async (email: string, password: string, displayName?: string, leaderInviteCode?: string): Promise<{ error: Error | null }> => {
    localStorage.removeItem(SCOUT_TOKEN_KEY);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    try {
      const profile = await authApi.registerProfile({ displayName, role: 'scout_leader', leaderInviteCode });
      setUser({ ...profile, archetype: normalizeArchetype(profile?.archetype) });
      setProfileStatus('loaded');
    } catch (err) {
      // Surface backend errors (e.g. invalid invite code) so the UI can show them.
      return { error: err instanceof Error ? err : new Error('Leader profile setup failed') };
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (DEMO_MODE) {
      setUser(createDemoUser());
      setProfileStatus('loaded');
      return { error: null };
    }
    // Clear any stale scout token — Supabase sign-in must not be overridden by it.
    localStorage.removeItem(SCOUT_TOKEN_KEY);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    // onAuthStateChange(SIGNED_IN) will clear the stale user and call fetchProfile().
    return { error: null };
  };

  const scoutSignIn = async (troopCode: string, nickname: string, pin: string): Promise<{ error: Error | null }> => {
    try {
      const { token, user: scoutUser } = await scoutAuthApi.login({ troopCode, nickname, pin });
      localStorage.setItem(SCOUT_TOKEN_KEY, token);
      setUser({
        ...scoutUser,
        archetype: normalizeArchetype(scoutUser?.archetype || 'scout'),
        isScoutAccount: scoutUser.isScoutAccount ?? true,
        isScoutMember: scoutUser.isScoutMember ?? true,
      });
      setProfileStatus('loaded');
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Login failed') };
    }
  };

  const signOut = async () => {
    if (DEMO_MODE) {
      setUser(null);
      setProfileStatus('idle');
      return;
    }
    if (localStorage.getItem(SCOUT_TOKEN_KEY)) {
      localStorage.removeItem(SCOUT_TOKEN_KEY);
      setUser(null);
      setProfileStatus('idle');
      return;
    }
    await supabase.auth.signOut();
    // onAuthStateChange(SIGNED_OUT) clears user, session, and profileStatus.
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const contextValue: AuthContextType = {
    user, session, loading, profileStatus, retryProfile,
    signUp, signUpParent, signUpLeader, signIn, scoutSignIn, signOut, refreshProfile,
  };

  // Profile-loading gate: while a Supabase session exists but the backend profile
  // hasn't resolved yet, render a role-neutral screen so parent/leader/teen UI
  // never flickers or renders with the wrong role.
  //
  // This intentionally renders BEFORE children so ProtectedRoute never sees
  // user=null-while-authenticated and incorrectly bounces to /auth.
  if (!loading && session) {
    if (profileStatus === 'loading') {
      return (
        <AuthContext.Provider value={contextValue}>
          <div className="min-h-screen flex items-center justify-center bg-background">
            <p className="text-muted-foreground text-sm">Getting your account ready…</p>
          </div>
        </AuthContext.Provider>
      );
    }

    if (profileStatus === 'error') {
      return (
        <AuthContext.Provider value={contextValue}>
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
            <p className="text-muted-foreground text-sm">
              We couldn't load your account. Please try again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={retryProfile}
                className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Retry
              </button>
              <button
                onClick={signOut}
                className="text-sm px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-muted"
              >
                Sign out
              </button>
            </div>
          </div>
        </AuthContext.Provider>
      );
    }
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
