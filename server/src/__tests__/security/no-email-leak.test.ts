import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authRequest } from '../helpers/request';
import { User } from '../../models';

describe('No email leak in API responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/users should not include email field', async () => {
    const res = await authRequest().get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body.users).toBeDefined();

    if (res.body.users.length > 0) {
      const user = res.body.users[0];
      expect(user.email).toBeUndefined();
    }
  });

  it('GET /api/users response shape excludes sensitive fields', async () => {
    const res = await authRequest().get('/api/users');

    expect(res.status).toBe(200);
    if (res.body.users.length > 0) {
      const user = res.body.users[0];
      // Verify only safe fields are present
      const allowedKeys = [
        'id',
        'displayName',
        'handle',
        'avatarUrl',
        'role',
        'archetype',
        'interests',
        'createdAt',
      ];
      for (const key of Object.keys(user)) {
        expect(allowedKeys).toContain(key);
      }
    }
  });

  it('GET /api/auth/me returns profile for own user (email allowed for self)', async () => {
    (User.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: 'demo-user',
          auth_id: 'demo-auth-id',
          email: 'secret@example.com',
          display_name: 'Test User',
          avatar_url: 'https://example.com/avatar.png',
          role: 'teen',
          archetype: 'explorer',
          interests: ['coding'],
          created_at: new Date(),
        }),
      }),
    });

    const res = await authRequest().get('/api/auth/me');

    expect(res.status).toBe(200);

    // Internal fields should not leak
    expect(res.body.auth_id).toBeUndefined();
    expect(res.body.password).toBeUndefined();
    expect(res.body.consent_flags).toBeUndefined();
    expect(res.body.parent_contact).toBeUndefined();
  });
});
