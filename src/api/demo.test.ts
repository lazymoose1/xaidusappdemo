import { describe, it, expect } from 'vitest';
import { buildMockResponse } from '@/api/demo';

describe('buildMockResponse', () => {
  it('returns correct user shape for /api/auth/me', () => {
    const result = buildMockResponse('/api/auth/me');
    expect(result).toEqual({
      id: 'demo-user',
      role: 'teen',
      displayName: 'Demo User',
      archetype: 'creator',
      interests: ['learning', 'creativity'],
    });
  });

  it('returns array for /api/goals', () => {
    const result = buildMockResponse('/api/goals');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('title');
    expect(result[0]).toHaveProperty('progress');
    expect(result[0]).toHaveProperty('completed');
  });

  it('returns array with today goal fields for /api/goals/today', () => {
    const result = buildMockResponse('/api/goals/today');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('title');
    expect(result[0]).toHaveProperty('microStep');
    expect(result[0]).toHaveProperty('plannedCount');
    expect(result[0]).toHaveProperty('completedThisWeek');
    expect(result[0]).toHaveProperty('progress');
    expect(result[0]).toHaveProperty('completed');
  });

  it('returns threads shape for /api/threads', () => {
    const result = buildMockResponse('/api/threads');
    expect(result).toHaveProperty('threads');
    expect(result).toHaveProperty('thread');
    expect(result).toHaveProperty('demo', true);
    expect(Array.isArray(result.threads)).toBe(true);
    expect(result.threads.length).toBe(2);
  });

  it('returns empty array for /api/posts', () => {
    const result = buildMockResponse('/api/posts');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('returns 3 children for /api/parent-portal/children', () => {
    const result = buildMockResponse('/api/parent-portal/children');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('displayName');
    expect(result[0]).toHaveProperty('archetype');
    expect(result[0]).toHaveProperty('goals');
    expect(Array.isArray(result[0].goals)).toBe(true);
  });

  it('returns dashboard shape for /api/parent-portal/dashboard', () => {
    const result = buildMockResponse('/api/parent-portal/dashboard');
    expect(result).toHaveProperty('totalChildren', 3);
    expect(result).toHaveProperty('totalGoals');
    expect(result).toHaveProperty('completedGoals');
    expect(result).toHaveProperty('aiSuggestedGoals');
    expect(result).toHaveProperty('averageProgress');
    expect(result).toHaveProperty('byArchetype');
    expect(typeof result.totalGoals).toBe('number');
  });

  it('returns achievements shape for /api/achievements', () => {
    const result = buildMockResponse('/api/achievements');
    expect(result).toHaveProperty('streak');
    expect(result.streak).toHaveProperty('current');
    expect(result.streak).toHaveProperty('longest');
    expect(result).toHaveProperty('badges');
    expect(result).toHaveProperty('achievements');
    expect(Array.isArray(result.badges)).toBe(true);
    expect(Array.isArray(result.achievements)).toBe(true);
  });

  it('returns weekly summary shape for /api/parent-portal/weekly-summary', () => {
    const result = buildMockResponse('/api/parent-portal/weekly-summary');
    expect(result).toHaveProperty('goalsSet');
    expect(result).toHaveProperty('goalsCompleted');
    expect(result).toHaveProperty('trend');
    expect(result).toHaveProperty('cadence');
    expect(result).toHaveProperty('conversationStarters');
    expect(Array.isArray(result.trend)).toBe(true);
  });

  it('returns messages for /api/threads/demo-thread-1/messages', () => {
    const result = buildMockResponse('/api/threads/demo-thread-1/messages');
    expect(result).toHaveProperty('messages');
    expect(result).toHaveProperty('demo', true);
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it('returns { ok: true, mock: true } for unknown path', () => {
    const result = buildMockResponse('/api/unknown/path');
    expect(result).toEqual({ ok: true, mock: true });
  });

  it('returns health check for /api/health', () => {
    const result = buildMockResponse('/api/health');
    expect(result).toEqual({ status: 'ok', mock: true });
  });

  it('returns empty array for /api/reminders/due', () => {
    const result = buildMockResponse('/api/reminders/due');
    expect(result).toEqual([]);
  });

  it('returns AI ask response for /api/ask', () => {
    const result = buildMockResponse('/api/ask');
    expect(result).toHaveProperty('ok', true);
    expect(result).toHaveProperty('suggestion');
    expect(result).toHaveProperty('rating');
    expect(result).toHaveProperty('reason');
  });

  it('returns AI tiny advice for /api/ai/tiny', () => {
    const result = buildMockResponse('/api/ai/tiny/advice');
    expect(result).toHaveProperty('goals');
    expect(result).toHaveProperty('steps');
    expect(result).toHaveProperty('schedule');
    expect(result).toHaveProperty('insights');
  });
});
