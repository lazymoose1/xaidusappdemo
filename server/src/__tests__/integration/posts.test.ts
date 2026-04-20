import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

vi.mock('../../services/post.service', () => ({
  listPosts: vi.fn().mockResolvedValue([
    {
      id: 'p1',
      authorId: 'demo-user',
      content: 'Hello world',
      mediaType: null,
      mediaUrl: null,
      visibility: 'public',
      createdAt: new Date().toISOString(),
      author: { id: 'demo-user', displayName: 'Demo', avatarUrl: '' },
      commentsCount: 0,
    },
  ]),
  getPost: vi.fn().mockResolvedValue({
    id: 'p1',
    authorId: 'demo-user',
    content: 'Hello world',
    mediaType: null,
    mediaUrl: null,
    visibility: 'public',
    createdAt: new Date().toISOString(),
    author: { id: 'demo-user', displayName: 'Demo', avatarUrl: '' },
    commentsCount: 0,
  }),
  createPost: vi.fn().mockResolvedValue({
    id: 'p-new',
    author_id: 'demo-user',
    content: 'New post',
    created_at: new Date(),
  }),
  getComments: vi.fn().mockResolvedValue([]),
  createComment: vi.fn().mockResolvedValue({
    id: 'c-new',
    postId: 'p1',
    text: 'Nice!',
    createdAt: new Date().toISOString(),
  }),
}));

describe('Posts routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/posts', () => {
    it('returns 200 with array of posts', async () => {
      const res = await authRequest().get('/api/posts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await request.get('/api/posts');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/posts/:id', () => {
    it('returns 200 with post details', async () => {
      const res = await authRequest().get('/api/posts/p1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'p1');
    });
  });

  describe('POST /api/posts', () => {
    it('returns 201 when creating a post', async () => {
      const res = await authRequest()
        .post('/api/posts')
        .send({ content: 'New post' });
      expect(res.status).toBe(201);
    });

    it('returns 400 for missing content', async () => {
      const res = await authRequest()
        .post('/api/posts')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid request');
    });

    it('returns 400 for empty content', async () => {
      const res = await authRequest()
        .post('/api/posts')
        .send({ content: '' });
      expect(res.status).toBe(400);
    });

    it('returns 401 without auth', async () => {
      const res = await request
        .post('/api/posts')
        .send({ content: 'Test' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/posts/:id/comments', () => {
    it('returns 200 with comments array', async () => {
      const res = await authRequest().get('/api/posts/p1/comments');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/posts/:id/comments', () => {
    it('returns 201 when creating a comment', async () => {
      const res = await authRequest()
        .post('/api/posts/p1/comments')
        .send({ text: 'Nice!' });
      expect(res.status).toBe(201);
    });

    it('returns 400 for missing text', async () => {
      const res = await authRequest()
        .post('/api/posts/p1/comments')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid request');
    });

    it('returns 401 without auth', async () => {
      const res = await request
        .post('/api/posts/p1/comments')
        .send({ text: 'Nice!' });
      expect(res.status).toBe(401);
    });
  });
});
