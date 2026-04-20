import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

vi.mock('../../services/user.service', () => ({
  searchUsers: vi.fn().mockResolvedValue([
    {
      id: 'u1',
      displayName: 'Test User',
      handle: '@testuser',
      avatarUrl: '',
      role: 'teen',
      archetype: '',
      interests: [],
      createdAt: new Date().toISOString(),
    },
  ]),
}));

describe('Users routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('returns 200 with users list', async () => {
      const res = await authRequest().get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await request.get('/api/users');
      expect(res.status).toBe(401);
    });
  });
});
