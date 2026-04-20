/**
 * Canonical AI wrapper client.
 * All AI calls route through callAiWrapper() → Dus backend → OpenAI.
 * No direct external AI service calls from the frontend.
 */

import { apiFetch } from '@/api/client';

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

// ─── Main export ──────────────────────────────────────────────────────────────

export async function callAiWrapper(payload: AiWrapperRequest): Promise<AiWrapperResponse> {
  try {
    const data = await apiFetch<AiWrapperResponse>('/api/ai/tiny/advice', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        ageGroup: payload.ageGroup ?? '14-18',
      }),
    });

    if (typeof data?.suggestion !== 'string') {
      console.warn('[aiClient] Unexpected response shape:', data);
      return LOCAL_FALLBACK;
    }

    return { ok: true, ...data };
  } catch (err) {
    console.warn('[aiClient] AI request failed:', err);
    return LOCAL_FALLBACK;
  }
}
