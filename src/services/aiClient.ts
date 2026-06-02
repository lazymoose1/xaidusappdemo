/**
 * Canonical AI wrapper client.
 * All AI calls route through callAiWrapper() → Dus backend → OpenAI.
 * No direct external AI service calls from the frontend.
 */

import { apiFetch, API_BASE } from '@/api/client';

// ─── Request shape ────────────────────────────────────────────────────────────

export type AiWrapperRequest = {
  goal: string;
  goalType?: string;
  goalSize?: string;
  goalDays?: string[];
  checkInWindow?: string;
  archetype?: string;
  coachStyle?: string;
  interests?: string[];
  recentActivity?: {
    daysCheckedInThisWeek?: number;
    dailyCheckInStreak?: number;
    lastCheckInStatus?: string;
    weeklyResetComplete?: boolean;
    lastGoalOutcome?: string;
  };
  orgId?: string;
  ageGroup?: string;
  /** Optional summarized social context — never raw post content. */
  socialContext?: string;
};

// ─── Response shape ───────────────────────────────────────────────────────────

export type AiWrapperResponse = {
  ok: boolean;
  suggestion: string;
  nextStep?: string;
  timingSuggestion?: string;
  rationale?: string;
  tone?: string;
  ageGroup?: string;
  meta?: {
    fallbackUsed?: boolean;
    localFallback?: boolean;
    fallbackReason?: string;
    providersConnected?: string[];
    socialContextUsed?: boolean;
  };
};

// ─── Local fallback (shown when the backend is unreachable or unauthenticated) ─

const LOCAL_FALLBACK: AiWrapperResponse = {
  ok: true,
  suggestion: 'Pick the easiest 5-minute version of your goal.',
  meta: {
    fallbackUsed: true,
    localFallback: true,
    fallbackReason: 'client_unavailable',
    providersConnected: [],
    socialContextUsed: false,
  },
};

const TINY_TIMEOUT_MS = 15_000;

// ─── Main export ──────────────────────────────────────────────────────────────

export async function callAiWrapper(payload: AiWrapperRequest): Promise<AiWrapperResponse> {
  const tinyApiUrl = `${API_BASE}/api/ai/tiny/advice`;

  console.info('[tiny] request_started', {
    tinyApiUrl,
    hasGoal: Boolean(payload.goal?.trim()),
    interestCount: payload.interests?.length ?? 0,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TINY_TIMEOUT_MS);

  try {
    const data = await apiFetch<AiWrapperResponse>('/api/ai/tiny/advice', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        ageGroup: payload.ageGroup ?? '14-18',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (typeof data?.suggestion !== 'string') {
      console.warn('[tiny] fallback_used', {
        reason: 'unexpected_response_shape',
        tinyApiUrl,
        responseKeys: data && typeof data === 'object' ? Object.keys(data as Record<string, unknown>) : [],
      });
      return {
        ...LOCAL_FALLBACK,
        meta: { ...LOCAL_FALLBACK.meta, fallbackReason: 'unexpected_response_shape' },
      };
    }

    console.info('[tiny] response_received', {
      fallbackUsed: data.meta?.fallbackUsed ?? false,
      localFallback: data.meta?.localFallback ?? false,
      providersConnectedCount: data.meta?.providersConnected?.length ?? 0,
    });

    return { ok: true, ...data };
  } catch (err) {
    clearTimeout(timeoutId);
    const reason = controller.signal.aborted ? 'timeout' : (err instanceof Error ? err.message : String(err));
    console.warn('[tiny] fallback_used', {
      reason,
      tinyApiUrl,
      apiBase: API_BASE,
    });
    return {
      ...LOCAL_FALLBACK,
      meta: { ...LOCAL_FALLBACK.meta, fallbackReason: reason },
    };
  }
}
