import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

vi.mock('../../repositories/thread.repo', () => {
  const thread = {
    id: 't1',
    type: 'dm',
    title: '',
    members: [{ user_id: 'demo-user' }, { user_id: 'other-user' }],
    last_message: null,
    last_message_at: null,
    read_by: {},
    created_by: 'demo-user',
    created_at: new Date(),
    updated_at: new Date(),
  };
  return {
    findByUserId: vi.fn().mockResolvedValue([thread]),
    findById: vi.fn().mockResolvedValue(thread),
    findDmThread: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(thread),
    update: vi.fn().mockResolvedValue(thread),
  };
});

vi.mock('../../repositories/message.repo', () => {
  const msg = {
    id: 'm1',
    thread_id: 't1',
    sender_id: 'demo-user',
    text: 'Hello',
    attachments: [],
    created_at: new Date(),
  };
  return {
    findByThreadId: vi.fn().mockResolvedValue([msg]),
    create: vi.fn().mockResolvedValue(msg),
  };
});

describe('Threads routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/threads', () => {
    it('returns 200 with threads (teen role allowed)', async () => {
      const res = await authRequest().get('/api/threads');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('threads');
      expect(Array.isArray(res.body.threads)).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await request.get('/api/threads');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/threads', () => {
    it('returns 201 when creating a thread', async () => {
      const res = await authRequest()
        .post('/api/threads')
        .send({ participantIds: ['other-user'], type: 'dm' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('thread');
    });

    it('returns 400 when participantIds is empty', async () => {
      const res = await authRequest()
        .post('/api/threads')
        .send({ participantIds: [] });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'participantIds required');
    });

    it('returns 400 when participantIds is missing', async () => {
      const res = await authRequest()
        .post('/api/threads')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/threads/:threadId', () => {
    it('returns 200 with thread details', async () => {
      const res = await authRequest().get('/api/threads/t1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('thread');
    });
  });

  describe('GET /api/threads/:threadId/messages', () => {
    it('returns 200 with messages', async () => {
      const res = await authRequest().get('/api/threads/t1/messages');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
    });
  });

  describe('POST /api/threads/:threadId/messages', () => {
    it('returns 201 when sending a message', async () => {
      const res = await authRequest()
        .post('/api/threads/t1/messages')
        .send({ text: 'Hello!' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message');
    });

    it('returns 400 when text is missing', async () => {
      const res = await authRequest()
        .post('/api/threads/t1/messages')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'text is required');
    });
  });

  describe('POST /api/threads/:threadId/read', () => {
    it('returns 200 when marking as read', async () => {
      const res = await authRequest().post('/api/threads/t1/read');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });
});
