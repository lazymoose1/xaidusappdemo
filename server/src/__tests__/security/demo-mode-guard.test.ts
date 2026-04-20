import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request } from '../helpers/request';

// The env module is loaded once and cached. The controller reads env.NODE_ENV
// from the cached object. We can modify it directly in tests.
import { env } from '../../config/env';

describe('Demo mode guard', () => {
  const originalNodeEnv = env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original env value
    (env as any).NODE_ENV = originalNodeEnv;
  });

  it('POST /api/auth/demo returns 200 in development mode', async () => {
    // env.NODE_ENV is 'development' (set by setup.ts), so both
    // the route registration and controller check pass
    (env as any).NODE_ENV = 'development';

    const res = await request.post('/api/auth/demo');

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('demo-token');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe('demo-user');
    expect(res.body.user.role).toBe('teen');
  });

  it('POST /api/auth/demo returns 403 when NODE_ENV is production', async () => {
    // The route is already registered (at import time in dev mode),
    // but the controller has a secondary check: env.NODE_ENV !== 'development' -> 403
    (env as any).NODE_ENV = 'production';

    const res = await request.post('/api/auth/demo');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Demo auth not allowed');
  });

  it('POST /api/auth/demo returns 403 when NODE_ENV is test', async () => {
    (env as any).NODE_ENV = 'test';

    const res = await request.post('/api/auth/demo');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Demo auth not allowed');
  });
});
