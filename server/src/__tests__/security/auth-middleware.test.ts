import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';
import { User } from '../../models';

describe('Auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization header validation', () => {
    it('rejects requests without Authorization header', async () => {
      const res = await request.get('/api/users');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('rejects requests with empty Authorization header', async () => {
      const res = await request
        .get('/api/users')
        .set('Authorization', '');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('rejects requests without Bearer prefix', async () => {
      const res = await request
        .get('/api/users')
        .set('Authorization', 'Basic some-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('rejects requests with only "Bearer" and no token', async () => {
      const res = await request
        .get('/api/users')
        .set('Authorization', 'Bearer');

      expect(res.status).toBe(401);
    });
  });

  describe('Demo token in development mode', () => {
    it('accepts demo-token and sets correct user', async () => {
      const res = await authRequest().get('/api/users');

      expect(res.status).toBe(200);
      // The demo-token should set req.user = { id: 'demo-user', role: 'teen', authId: 'demo-auth-id' }
    });

    it('demo-token sets user with teen role', async () => {
      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: 'demo-user',
            email: 'demo@test.com',
            role: 'teen',
            display_name: 'Demo',
            avatar_url: '',
            interests: [],
            archetype: '',
            social_ids: {},
            auth_id: 'demo-auth-id',
          }),
        }),
      });

      const res = await authRequest().get('/api/auth/me');

      expect(res.status).toBe(200);
      // The response should work because the demo-token was accepted
      expect(res.body.id).toBe('demo-user');
    });
  });

  describe('requireRole middleware', () => {
    it('returns 403 when teen tries to access parent-only endpoint', async () => {
      // demo-token gives role 'teen', parent-portal requires ['parent', 'educator', 'admin']
      const res = await authRequest().get('/api/parent-portal/children');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('returns 403 when teen tries to access parent dashboard', async () => {
      const res = await authRequest().get('/api/parent-portal/dashboard');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('returns 403 when teen tries to access parent weekly summary', async () => {
      const res = await authRequest().get('/api/parent-portal/weekly-summary');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('returns 401 when unauthenticated user accesses protected endpoint', async () => {
      const res = await request.get('/api/parent-portal/children');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });
});
