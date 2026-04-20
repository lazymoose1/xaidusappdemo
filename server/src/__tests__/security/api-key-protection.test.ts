import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request } from '../helpers/request';

describe('API key protection for cron endpoints', () => {
  const cronEndpoints = [
    { method: 'post' as const, path: '/api/cron/weekly-reset' },
    { method: 'post' as const, path: '/api/cron/cache-refresh' },
    { method: 'post' as const, path: '/api/cron/cache-cleanup' },
    { method: 'post' as const, path: '/api/cron/reminder-delivery' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const endpoint of cronEndpoints) {
    it(`${endpoint.method.toUpperCase()} ${endpoint.path} rejects without x-api-key`, async () => {
      const res = await request[endpoint.method](endpoint.path);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it(`${endpoint.method.toUpperCase()} ${endpoint.path} rejects with wrong x-api-key`, async () => {
      const res = await request[endpoint.method](endpoint.path)
        .set('x-api-key', 'wrong-key');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it(`${endpoint.method.toUpperCase()} ${endpoint.path} accepts correct x-api-key`, async () => {
      const res = await request[endpoint.method](endpoint.path)
        .set('x-api-key', 'test-api-key');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  }
});

describe('API key protection for metrics endpoints', () => {
  const metricsEndpoints = [
    { method: 'get' as const, path: '/api/metrics/social-auth' },
    { method: 'get' as const, path: '/api/metrics/cache' },
    { method: 'get' as const, path: '/api/metrics/health' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const endpoint of metricsEndpoints) {
    it(`${endpoint.method.toUpperCase()} ${endpoint.path} rejects without x-api-key`, async () => {
      const res = await request[endpoint.method](endpoint.path);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it(`${endpoint.method.toUpperCase()} ${endpoint.path} rejects with wrong x-api-key`, async () => {
      const res = await request[endpoint.method](endpoint.path)
        .set('x-api-key', 'invalid-key-123');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it(`${endpoint.method.toUpperCase()} ${endpoint.path} accepts correct x-api-key`, async () => {
      const res = await request[endpoint.method](endpoint.path)
        .set('x-api-key', 'test-api-key');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  }

  it('metrics health endpoint returns health data with valid key', async () => {
    const res = await request
      .get('/api/metrics/health')
      .set('x-api-key', 'test-api-key');

    expect(res.status).toBe(200);
    expect(res.body.status).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });
});
