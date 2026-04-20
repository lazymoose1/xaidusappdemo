import * as parentChildLinkRepo from '../repositories/parent-child-link.repo';
import * as goalRepo from '../repositories/goal.repo';
import * as aiGoalFeedbackRepo from '../repositories/ai-goal-feedback.repo';
import * as userRepo from '../repositories/user.repo';

/**
 * CRITICAL FIX: Query parent_child_links table via repo.
 * Return empty array if no links found -- NEVER fall back to showing all teens.
 */
async function loadLinkedTeens(parentId: string) {
  const links = await parentChildLinkRepo.findChildrenByParent(parentId);
  return links.map((l) => l.child).filter((child): child is NonNullable<typeof child> => child !== null);
}

export async function getChildren(parentId: string) {
  const teens = await loadLinkedTeens(parentId);
  if (teens.length === 0) return [];

  const teenIds = teens.map((t) => t.id);
  const goalArrays = await Promise.all(teenIds.map((id) => goalRepo.findByUserId(id)));
  const goals = goalArrays.flat();

  const goalsByUser = new Map<string, any[]>();
  goals.forEach((g) => {
    const uid = g.user_id;
    if (!goalsByUser.has(uid)) goalsByUser.set(uid, []);
    goalsByUser.get(uid)!.push({
      id: g.id,
      title: g.title,
      progress: g.progress ?? 0,
      completed: g.completed,
    });
  });

  return teens.map((t) => ({
    id: t.id,
    displayName: t.display_name || 'User',
    avatarUrl: t.avatar_url || null,
    archetype: t.archetype || null,
    goals: goalsByUser.get(t.id) || [],
  }));
}

export async function getWeeklySummary(parentId: string) {
  const teens = await loadLinkedTeens(parentId);
  const parent = await userRepo.findById(parentId);

  const teenIds = teens.map((t) => t.id);
  const goalArrays = await Promise.all(teenIds.map((id) => goalRepo.findByUserId(id)));
  const goals = teenIds.length > 0 ? goalArrays.flat() : [];

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Single-pass aggregation: goalsSet, goalsCompleted, and 7-day trend
  const trend = [0, 0, 0, 0, 0, 0, 0];
  let goalsSet = 0;
  let goalsCompleted = 0;

  for (const g of goals) {
    if (g.created_at && new Date(g.created_at) >= oneWeekAgo) {
      goalsSet++;
    }
    if (g.completed_at) {
      const completedAt = new Date(g.completed_at);
      if (completedAt >= oneWeekAgo) {
        goalsCompleted++;
      }
      const dayIndex = Math.floor(
        (completedAt.getTime() - (now.getTime() - 6 * 24 * 60 * 60 * 1000)) /
          (24 * 60 * 60 * 1000),
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        trend[dayIndex]++;
      }
    }
  }

  const coachStyle =
    typeof parent?.coach_style === 'string' ? parent.coach_style : 'calm';

  return {
    goalsSet,
    goalsCompleted,
    trend,
    cadence: 'Sundays at 7:00pm',
    conversationStarters: [
      'Ask them what helped this week feel smoother.',
      'Which small win are you proud of?',
      "What's one thing we could do on Friday to make next week easier?",
    ],
    coachStyle,
  };
}

export async function getAISuggestedGoals(parentId: string) {
  const teens = await loadLinkedTeens(parentId);
  if (teens.length === 0) return { total: 0, goals: [] };

  const teenIds = teens.map((t) => t.id);
  const goalArrays = await Promise.all(teenIds.map((id) => goalRepo.findByUserId(id)));
  const goals = goalArrays.flat();
  const aiGoals = goals.filter((g) => g.source === 'ai');
  const feedbackArrays = await Promise.all(teenIds.map((id) => aiGoalFeedbackRepo.findByUserId(id)));
  const feedback = feedbackArrays.flat();

  const feedbackMap = new Map(feedback.map((f) => [f.goal_id, f]));

  const response = aiGoals.map((g) => ({
    id: g.id,
    userId: g.user_id,
    title: g.title,
    category: g.category,
    suggestionTitle: g.suggestion_title,
    progress: g.progress || 0,
    completed: g.completed,
    milestones: g.milestones || [],
    adoptedAt: g.adopted_at,
    feedback: feedbackMap.get(g.id) || null,
  }));

  return { total: response.length, goals: response };
}

export async function submitFeedback(
  childId: string,
  goalId: string,
  data: {
    feedback?: string;
    suggestedMilestones?: string[];
    encouragement?: string;
  },
) {
  return aiGoalFeedbackRepo.upsertFeedback(goalId, childId, {
    parentReviewed: true,
    parentReviewedAt: new Date(),
    parentFeedback: data.feedback,
    parentSuggestedMilestones: data.suggestedMilestones || [],
  });
}

export async function getDashboard(parentId: string) {
  const teens = await loadLinkedTeens(parentId);
  if (teens.length === 0) {
    return {
      totalChildren: 0,
      totalGoals: 0,
      completedGoals: 0,
      aiSuggestedGoals: 0,
      averageProgress: 0,
      byArchetype: {},
    };
  }

  const teenIds = teens.map((t) => t.id);
  const goalArrays = await Promise.all(teenIds.map((id) => goalRepo.findByUserId(id)));
  const goals = goalArrays.flat();

  const summary = {
    totalChildren: teens.length,
    totalGoals: goals.length,
    completedGoals: goals.filter((g) => g.completed).length,
    aiSuggestedGoals: goals.filter((g) => g.source === 'ai').length,
    averageProgress:
      goals.length > 0
        ? Math.round(
            goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length,
          )
        : 0,
    byArchetype: {} as Record<string, number>,
  };

  teens.forEach((t) => {
    const arch = t.archetype || 'unknown';
    summary.byArchetype[arch] = (summary.byArchetype[arch] || 0) + 1;
  });

  return summary;
}

export function getOverview() {
  // Mock aggregated insights for backward compatibility
  return {
    totalPostsLast30Days: 123,
    activityByTimeBand: { morning: 23, afternoon: 45, evening: 55 },
    topTopics: [
      { topic: 'friendship', count: 34 },
      { topic: 'school', count: 21 },
    ],
  };
}
