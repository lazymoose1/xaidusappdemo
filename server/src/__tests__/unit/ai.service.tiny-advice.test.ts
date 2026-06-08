import { beforeEach, describe, expect, it, vi } from 'vitest';

const envMock = vi.hoisted(() => ({
  NODE_ENV: 'test',
  PORT: 4000,
  MONGODB_URI: 'mongodb://localhost/test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  SYSTEM_API_KEY: 'system-key',
  TOKEN_ENCRYPTION_KEY: 'token-key',
  SOCIAL_PROFILE_SCRAPER_URL: 'https://scraper.internal',
  SOCIAL_PROFILE_SCRAPER_API_KEY: 'scraper-secret',
  SOCIAL_PROFILE_SCRAPER_TIMEOUT_MS: 3500,
  OPENAI_API_KEY: undefined as string | undefined,
  OPENAI_MODEL: 'gpt-5',
  NVIDIA_MODEL: 'nvidia/llama-3.3-nemotron-super-49b-v1',
  SMTP_PORT: 587,
  SMTP_FROM: 'no-reply@dus.app',
  SCOUT_JWT_SECRET: 'scout-test-secret',
  LEADER_INVITE_CODE: 'LEADER-TEST-CODE',
}));

vi.mock('../../config/env', () => ({ env: envMock }));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: vi.fn() } },
  })),
}));

vi.mock('../../repositories/goal.repo', () => ({
  findByUserId: vi.fn().mockResolvedValue([]),
  findById: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../repositories/ai-goal-feedback.repo', () => ({
  countByUserId: vi.fn().mockResolvedValue(0),
  create: vi.fn(),
  upsertFeedback: vi.fn(),
}));

vi.mock('../../repositories/parent-child-link.repo', () => ({
  findChildrenByParent: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/ai-context.service', () => ({
  buildAiContext: vi.fn().mockResolvedValue({
    user: {
      coachStyle: 'calm',
      archetype: 'achiever',
      interests: ['coding'],
      reminderWindows: ['after_school'],
      orgId: 'org-1',
    },
    goal: {
      title: 'Finish algebra homework',
      goalType: 'school',
      sizePreset: 'tiny',
      subjectTag: 'math',
      activeDays: ['mon'],
      carryOver: false,
    },
    recentActivity: {
      plannedGoalDaysThisWeek: 1,
      goalDaysCompletedThisWeek: 0,
      daysCheckedInThisWeek: 1,
      dailyCheckInStreak: 1,
      lastCheckInStatus: 'yes',
      lastGoalOutcome: 'none',
      weeklyResetComplete: false,
    },
    rewards: {
      isMoova: false,
      moovaCurrentConsistencyDays: 0,
      recentMarks: [],
      recentMoments: [],
    },
    social: {
      connectedPlatforms: [
        { platform: 'instagram', hasValidToken: true },
        { platform: 'tiktok', hasValidToken: false },
      ],
    },
  }),
}));

describe('tinyAdvice scraper integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.SOCIAL_PROFILE_SCRAPER_URL = 'https://scraper.internal';
    envMock.SOCIAL_PROFILE_SCRAPER_API_KEY = 'scraper-secret';
    global.fetch = vi.fn();
  });

  it('returns normalized scraper-backed advice without forwarding browser auth', async () => {
    const { tinyAdvice } = await import('../../services/ai.service');
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestion: 'Do the first three algebra problems before anything else.',
        nextStep: 'Open the worksheet and finish problem 1 now.',
        timingSuggestion: 'after school',
        rationale: 'Starting with a tiny chunk makes the homework feel manageable.',
        tone: 'calm',
      }),
    } as Response);

    const result = await tinyAdvice('teen-1', { goal: 'Finish algebra homework' }, 'Bearer browser-token');

    expect(result).toMatchObject({
      ok: true,
      suggestion: 'Do the first three algebra problems before anything else.',
      nextStep: 'Open the worksheet and finish problem 1 now.',
      timingSuggestion: 'after school',
      meta: { fallbackUsed: false, socialContextUsed: true, providersConnected: ['instagram'] },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://scraper.internal/api/ai/tiny/advice',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xaidus-service': 'xaidusappdemo',
          Authorization: 'Bearer scraper-secret',
        },
      }),
    );
    expect(JSON.stringify(vi.mocked(global.fetch).mock.calls[0][1])).not.toContain('browser-token');
  });

  it('returns the safe fallback when the scraper is unavailable', async () => {
    const { tinyAdvice } = await import('../../services/ai.service');
    envMock.OPENAI_API_KEY = undefined;
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 503 } as Response);

    const result = await tinyAdvice('teen-1', { goal: 'Finish algebra homework' });

    // The safe fallback is still a valid (ok) response; callers detect it via
    // meta.fallbackUsed / fallbackReason, not via ok.
    expect(result.ok).toBe(true);
    expect(result.meta).toMatchObject({
      fallbackUsed: true,
      socialContextUsed: false,
      fallbackReason: 'scraper_status_503',
    });
    expect(result.suggestion).toContain('Take 10 minutes');
  });

  it('returns the safe fallback when the scraper response is malformed', async () => {
    const { tinyAdvice } = await import('../../services/ai.service');
    envMock.OPENAI_API_KEY = undefined;
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ suggestion: 'Missing required fields' }),
    } as Response);

    const result = await tinyAdvice('teen-1', { goal: 'Finish algebra homework' });

    expect(result.ok).toBe(true);
    expect(result.meta?.fallbackUsed).toBe(true);
    expect(result.meta?.fallbackReason).toBe('scraper_malformed');
  });
});
