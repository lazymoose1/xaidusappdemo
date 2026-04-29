import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetSession = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

vi.mock('@/api/demo', () => ({
  buildMockResponse: vi.fn().mockReturnValue({ mock: true }),
}));

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    globalThis.fetch = vi.fn();
  });

  describe('when VITE_DEMO_MODE is true', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_DEMO_MODE', 'true');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('calls buildMockResponse instead of fetch', async () => {
      vi.resetModules();
      const { apiFetch } = await import('@/api/client');
      const { buildMockResponse } = await import('@/api/demo');

      const result = await apiFetch('/api/goals');
      expect(buildMockResponse).toHaveBeenCalledWith('/api/goals');
      expect(result).toEqual({ mock: true });
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('when VITE_DEMO_MODE is false (real mode)', () => {
    let apiFetch: (path: string, options?: RequestInit) => Promise<any>;

    beforeEach(async () => {
      vi.stubEnv('VITE_DEMO_MODE', 'false');
      vi.resetModules();
      const mod = await import('@/api/client');
      apiFetch = mod.apiFetch;
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('calls fetch with correct URL and content-type header', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: 'test' }),
      });

      await apiFetch('/api/goals');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/goals',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('sets Authorization header when session has access_token', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-jwt-token' } },
      });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: 'test' }),
      });

      await apiFetch('/api/goals');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/goals',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-jwt-token',
          }),
        }),
      );
    });

    it('falls back to a live getSession lookup when the cached token is empty', async () => {
      mockGetSession
        .mockResolvedValueOnce({ data: { session: null } })
        .mockResolvedValueOnce({
          data: { session: { access_token: 'live-jwt-token' } },
        });

      vi.resetModules();
      const mod = await import('@/api/client');
      apiFetch = mod.apiFetch;

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: 'test' }),
      });

      await apiFetch('/api/auth/me');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer live-jwt-token',
          }),
        }),
      );
    });

    it('does not set Authorization header when no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      await apiFetch('/api/goals');

      const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].headers).not.toHaveProperty('Authorization');
    });

    it('throws an error when response is not ok', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({ error: 'Goal not found' }),
      });

      await expect(apiFetch('/api/goals/123')).rejects.toThrow('Goal not found');
    });

    it('uses statusText when response body has no error field', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({}),
      });

      await expect(apiFetch('/api/goals')).rejects.toThrow('Internal Server Error');
    });

    it('uses statusText when response body JSON parse fails', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        statusText: 'Bad Gateway',
        json: vi.fn().mockRejectedValue(new Error('invalid json')),
      });

      await expect(apiFetch('/api/goals')).rejects.toThrow('Bad Gateway');
    });

    it('passes through custom options', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      await apiFetch('/api/goals', { method: 'POST', body: '{"title":"test"}' });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/goals',
        expect.objectContaining({
          method: 'POST',
          body: '{"title":"test"}',
        }),
      );
    });
  });
});
