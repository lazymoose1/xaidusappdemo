import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

// Mock endpoints
vi.mock('@/api/endpoints', () => ({
  authApi: {
    getMe: vi.fn().mockResolvedValue({
      id: 'real-user',
      role: 'teen',
      displayName: 'Real User',
      archetype: 'explorer',
      interests: [],
    }),
    registerProfile: vi.fn().mockResolvedValue({
      id: 'new-user',
      role: 'teen',
      displayName: 'New User',
      archetype: 'explorer',
    }),
    saveSettings: vi.fn(),
  },
}));

// Mock archetypes
vi.mock('@/lib/archetypes', () => ({
  normalizeArchetype: (raw?: string | null) => raw || 'explorer',
  DEFAULT_ARCHETYPE: 'explorer',
}));

const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
let authStateChangeHandler: ((event: string, session: any) => void) | null = null;
const mockOnAuthStateChange = vi.fn().mockImplementation((handler: typeof authStateChangeHandler) => {
  authStateChangeHandler = handler;
  return {
    data: { subscription: { unsubscribe: vi.fn() } },
  };
});
const mockSignOut = vi.fn().mockResolvedValue({});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: (...args: any[]) => mockSignOut(...args),
    },
  },
}));

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateChangeHandler = null;
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignOut.mockImplementation(async () => {
      authStateChangeHandler?.('SIGNED_OUT', null);
      return {};
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  describe('non-demo mode', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_DEMO_MODE', 'false');
      vi.resetModules();
    });

    it('starts with loading=true then resolves to loading=false (no session)', async () => {
      const mod = await import('@/providers/AuthProvider');
      const Provider = mod.AuthProvider;
      const useAuthHook = mod.useAuth;

      function Consumer() {
        const { user, loading } = useAuthHook();
        return (
          <div>
            <span data-testid="loading">{String(loading)}</span>
            <span data-testid="user">{user ? user.displayName : 'null'}</span>
          </div>
        );
      }

      render(
        <Provider>
          <Consumer />
        </Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    it('loads user profile when session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'jwt-token' } },
      });

      const mod = await import('@/providers/AuthProvider');
      const Provider = mod.AuthProvider;
      const useAuthHook = mod.useAuth;

      function Consumer() {
        const { user, loading } = useAuthHook();
        return (
          <div>
            <span data-testid="loading">{String(loading)}</span>
            <span data-testid="user">{user ? user.displayName : 'null'}</span>
          </div>
        );
      }

      render(
        <Provider>
          <Consumer />
        </Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
      expect(screen.getByTestId('user').textContent).toBe('Real User');
    });

    it('throws when useAuth is used outside AuthProvider', async () => {
      const mod = await import('@/providers/AuthProvider');
      const useAuthHook = mod.useAuth;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useAuthHook());
      }).toThrow('useAuth must be used within an AuthProvider');
      consoleSpy.mockRestore();
    });

    it('signOut clears the user', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'jwt' } },
      });

      const mod = await import('@/providers/AuthProvider');
      const Provider = mod.AuthProvider;
      const useAuthHook = mod.useAuth;

      function Consumer() {
        const { user, loading, signOut } = useAuthHook();
        return (
          <div>
            <span data-testid="loading">{String(loading)}</span>
            <span data-testid="user">{user ? user.displayName : 'null'}</span>
            <button data-testid="signout" onClick={() => signOut()}>
              Sign Out
            </button>
          </div>
        );
      }

      render(
        <Provider>
          <Consumer />
        </Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
      expect(screen.getByTestId('user').textContent).toBe('Real User');

      await act(async () => {
        screen.getByTestId('signout').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null');
      });
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('demo mode', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_DEMO_MODE', 'true');
      vi.resetModules();
    });

    it('immediately sets demo user when VITE_DEMO_MODE is true', async () => {
      const mod = await import('@/providers/AuthProvider');
      const Provider = mod.AuthProvider;
      const useAuthHook = mod.useAuth;

      function Consumer() {
        const { user, loading } = useAuthHook();
        return (
          <div>
            <span data-testid="loading">{String(loading)}</span>
            <span data-testid="user">{user ? user.displayName : 'null'}</span>
            <span data-testid="role">{user ? user.role : 'none'}</span>
          </div>
        );
      }

      render(
        <Provider>
          <Consumer />
        </Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
      expect(screen.getByTestId('user').textContent).toBe('Demo User');
      expect(screen.getByTestId('role').textContent).toBe('teen');
      // Should not call supabase in demo mode
      expect(mockGetSession).not.toHaveBeenCalled();
    });
  });
});
