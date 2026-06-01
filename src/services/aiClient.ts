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
    providersConnected?: string[];
    socialContextUsed?: boolean;
  };
};

// ─── Local fallback (shown when the backend is unreachable or unauthenticated) ─

const LOCAL_FALLBACK: AiWrapperResponse = {
  ok: true,
  suggestion: 'Pick the easiest 5-minute version of your goal.',
  meta: { fallbackUsed: true, providersConnected: [], socialContextUsed: false },
};

const TINY_DEBUG = import.meta.env.DEV;
const TINY_TIMEOUT_MS = 15_000;

// ─── Main export ──────────────────────────────────────────────────────────────

export async function callAiWrapper(payload: AiWrapperRequest): Promise<AiWrapperResponse> {
  const tinyApiUrl = `${API_BASE}/api/ai/tiny/advice`;

  if (TINY_DEBUG) {
    console.debug('[tiny] tiny_request_started', { tiny_api_url: tinyApiUrl, goal_prefix: payload.goal?.slice(0, 60) });
  }

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
      if (TINY_DEBUG) console.debug('[tiny] tiny_used_fallback', true, 'reason: unexpected_shape', data);
      return LOCAL_FALLBACK;
    }

    if (TINY_DEBUG) {
      console.debug('[tiny] tiny_response_field_used', 'suggestion', {
        tiny_used_fallback: data.meta?.fallbackUsed ?? false,
        tiny_response_status: 'ok',
      });
    }

    return { ok: true, ...data };
  } catch (err) {
    clearTimeout(timeoutId);
    const reason = controller.signal.aborted ? 'timeout' : (err instanceof Error ? err.message : String(err));
    if (TINY_DEBUG) console.debug('[tiny] tiny_used_fallback', true, 'reason:', reason);
    return LOCAL_FALLBACK;
  }
}
