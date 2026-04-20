import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

// Mock the user service and supabase at the service/repo level
vi.mock('../../services/user.service', () => ({
  registerProfile: vi.fn().mockResolvedValue({
    id: 'new-user-id',
    role: 'teen',
    displayName: 'Test User',
  }),
  getProfile: vi.fn().mockResolvedValue({
    id: 'demo-user',
    email: 'demo@test.com',
    role: 'teen',
    displayName: 'Demo User',
    avatarUrl: '',
    interests: [],
    archetype: '',
    social: {},
  }),
}));

describe('Auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/demo', () => {
    it('returns 200 with token and user in dev mode', async () => {
      const res = await request.post('/api/auth/demo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token', 'demo-token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toMatchObject({
        id: 'demo-user',
        role: 'teen',
      });
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 200 with user profile when authenticated', async () => {
      const res = await authRequest().get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'demo-user');
      expect(res.body).toHaveProperty('role', 'teen');
    });

    it('returns 401 without auth header', async () => {
      const res = await request.get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/register-profile', () => {
    it('returns 201 when creating profile with auth', async () => {
      const res = await authRequest()
        .post('/api/auth/register-profile')
        .send({ displayName: 'Test User', role: 'teen' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('role');
    });

    it('returns 401 without auth header', async () => {
      const res = await request
        .post('/api/auth/register-profile')
        .send({ displayName: 'Test User' });
      expect(res.status).toBe(401);
    });
  });
});
