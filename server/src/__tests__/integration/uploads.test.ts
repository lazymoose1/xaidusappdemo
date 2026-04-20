import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

vi.mock('../../services/upload.service', () => ({
  createSignedUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: 'https://test.supabase.co/storage/v1/upload/sign/uploads/file.png',
    token: 'upload-token',
    path: 'uploads/file.png',
    publicUrl: 'https://test.supabase.co/storage/v1/object/public/uploads/file.png',
  }),
}));

describe('Uploads routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/uploads/presign', () => {
    it('returns 200 with signed URL when authenticated', async () => {
      const res = await authRequest()
        .post('/api/uploads/presign')
        .send({ filename: 'photo.png' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('uploadUrl');
      expect(res.body).toHaveProperty('publicUrl');
    });

    it('returns 400 when filename is missing', async () => {
      const res = await authRequest()
        .post('/api/uploads/presign')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'filename required');
    });

    it('returns 401 without auth', async () => {
      const res = await request
        .post('/api/uploads/presign')
        .send({ filename: 'photo.png' });
      expect(res.status).toBe(401);
    });
  });
});
