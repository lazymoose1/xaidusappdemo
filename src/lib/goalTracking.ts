/**
 * Goal Source Tracking Utilities
 * Manages tracking of goal origin (AI vs manual) and adoption metrics
 */

export type GoalSource = 'ai' | 'manual';

export interface GoalSourceMeta {
  source: GoalSource;
  suggestionId?: string;
  suggestionTitle?: string;
  adoptedAt?: string;
  archetypeAligned?: boolean;
}

export interface GoalAdoptionData {
  goalId: string;
  userId: string;
  source: GoalSource;
  suggestionTitle?: string;
  adoptedAt?: string;
  archetypeAligned?: boolean;
}

/**
 * Check if a goal title matches any AI suggestion from the current session
 */
interface AISuggestion {
  id?: string;
  title: string;
  category?: string;
  reason?: string;
  archetypeAligned?: boolean;
}

export function findMatchingSuggestion(goalTitle: string, suggestions: AISuggestion[] = []) {
  return suggestions.find((g) =>
    g.title && g.title.toLowerCase() === goalTitle.toLowerCase()
  );
}

/**
 * Get AI suggestions from session storage
 */
export function getSessionAISuggestions() {
  try {
    const tinyAdvice = JSON.parse(sessionStorage.getItem('tinyAdvice') || '{}');
    return {
      goals: tinyAdvice.goals || [],
      steps: tinyAdvice.steps || []
    };
  } catch {
    return { goals: [], steps: [] };
  }
}

/**
 * Store AI suggestions in session storage
 */
export function storeSessionAISuggestions(advice: { goals?: AISuggestion[]; steps?: AISuggestion[] }) {
  try {
    sessionStorage.setItem('tinyAdvice', JSON.stringify(advice));
  } catch (err) {
    console.error('Failed to store AI suggestions:', err);
  }
}

/**
 * Clear AI suggestions from session storage
 */
export function clearSessionAISuggestions() {
  try {
    sessionStorage.removeItem('tinyAdvice');
  } catch (err) {
    console.error('Failed to clear AI suggestions:', err);
  }
}

/**
 * Determine goal source based on suggestion match
 */
export function determineGoalSource(
  goalTitle: string,
  suggestions: AISuggestion[] = []
): GoalSourceMeta {
  const match = findMatchingSuggestion(goalTitle, suggestions);
  
  if (match) {
    return {
      source: 'ai',
      suggestionId: match.id,
      suggestionTitle: match.title,
      adoptedAt: new Date().toISOString(),
      archetypeAligned: match.archetypeAligned ?? false
    };
  }

  return {
    source: 'manual'
  };
}

/**
 * Mark an adopted goal in the backend for tracking
 */
export async function markGoalAsAIAdopted(
  goalId: string,
  metadata: Omit<GoalSourceMeta, 'source'>
): Promise<boolean> {
  try {
    const response = await fetch(`/api/goals/${goalId}/mark-ai-adopted`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestionId: metadata.suggestionId,
        suggestionTitle: metadata.suggestionTitle,
        archetypeAligned: metadata.archetypeAligned
      })
    });

    if (!response.ok) {
      console.error('Failed to mark goal as AI-adopted');
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error marking goal as AI-adopted:', err);
    return false;
  }
}

/**
 * Get analytics on goal adoption and completion
 */
export async function fetchGoalAnalytics() {
  try {
    const response = await fetch('/api/user/goal-analytics', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }

    return await response.json();
  } catch (err) {
    console.error('Error fetching goal analytics:', err);
    return null;
  }
}

/**
 * Format goal source for display
 */
export function formatGoalSource(source: GoalSource, suggestionTitle?: string): string {
  if (source === 'ai') {
    return `From TINY: ${suggestionTitle || 'AI suggestion'}`;
  }
  return 'Your custom goal';
}

/**
 * Get visual indicator for goal source
 */
export function getSourceBadgeConfig(source: GoalSource) {
  const configs = {
    ai: {
      text: '✨ AI-Suggested',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
      icon: '✨'
    },
    manual: {
      text: '🎯 Your Goal',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
      icon: '🎯'
    }
  };

  return configs[source];
}

/**
 * Calculate adoption rate across all goals
 */
export function calculateAdoptionRate(goals: { source?: GoalSource }[]): number {
  if (goals.length === 0) return 0;
  const aiGoals = goals.filter(g => g.source === 'ai').length;
  return Math.round((aiGoals / goals.length) * 100);
}

/**
 * Filter goals by source
 */
export function filterGoalsBySource<T extends { source?: GoalSource }>(goals: T[], source: GoalSource | 'all'): T[] {
  if (source === 'all') return goals;
  return goals.filter(g => g.source === source);
}
