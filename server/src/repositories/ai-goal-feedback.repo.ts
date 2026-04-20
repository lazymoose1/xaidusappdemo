import { AiGoalFeedback } from '../models';
import { withId, withIds } from '../lib/mongo-helpers';

export async function findByGoalAndUser(goalId: string, userId: string) {
  const doc = await AiGoalFeedback.findOne({ goal_id: goalId, user_id: userId }).lean();
  return withId(doc);
}

export async function create(data: {
  userId: string;
  goalId: string;
  adoptionReason?: string;
}) {
  const doc = await AiGoalFeedback.create({
    user_id: data.userId,
    goal_id: data.goalId,
    adoption_reason: data.adoptionReason,
  });
  return { ...doc.toObject(), id: doc._id.toString() };
}

export async function update(
  id: string,
  data: {
    parentReviewed?: boolean;
    parentReviewedAt?: Date;
    parentFeedback?: string;
    parentSuggestedMilestones?: string[];
    parentEncouragement?: string;
    completionTimeline?: string;
    milestonesCompleted?: number;
    lastMilestoneCompletedAt?: Date;
  },
) {
  const doc = await AiGoalFeedback.findByIdAndUpdate(
    id,
    {
      parent_reviewed: data.parentReviewed,
      parent_reviewed_at: data.parentReviewedAt,
      parent_feedback: data.parentFeedback,
      parent_suggested_milestones: data.parentSuggestedMilestones,
      completion_timeline: data.completionTimeline,
      milestones_completed: data.milestonesCompleted,
      last_milestone_completed_at: data.lastMilestoneCompletedAt,
    },
    { new: true },
  ).lean();
  return withId(doc);
}

export function countByUserId(userId: string) {
  return AiGoalFeedback.countDocuments({ user_id: userId });
}

export async function findByUserId(userId: string) {
  const docs = await AiGoalFeedback.find({ user_id: userId }).lean();
  return withIds(docs);
}

export async function findByUserIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  const results = await Promise.all(
    userIds.map((id) => AiGoalFeedback.find({ user_id: id }).lean()),
  );
  return withIds(results.flat());
}

export async function upsertByGoalAndUser(
  goalId: string,
  userId: string,
  data: {
    parentReviewed?: boolean;
    parentReviewedAt?: Date;
    parentFeedback?: string;
    parentSuggestedMilestones?: string[];
    parentEncouragement?: string;
    completionTimeline?: string;
  },
) {
  const doc = await AiGoalFeedback.findOneAndUpdate(
    { goal_id: goalId, user_id: userId },
    {
      $set: {
        parent_reviewed: data.parentReviewed,
        parent_reviewed_at: data.parentReviewedAt,
        parent_feedback: data.parentFeedback,
        parent_suggested_milestones: data.parentSuggestedMilestones,
        completion_timeline: data.completionTimeline,
      },
    },
    { upsert: true, new: true },
  ).lean();
  return withId(doc);
}

export async function upsertFeedback(
  goalId: string,
  userId: string,
  data: {
    parentReviewed?: boolean;
    parentReviewedAt?: Date;
    parentFeedback?: string;
    parentSuggestedMilestones?: string[];
    completionTimeline?: string;
  },
) {
  const doc = await AiGoalFeedback.findOneAndUpdate(
    { goal_id: goalId, user_id: userId },
    {
      $set: {
        parent_reviewed: data.parentReviewed,
        parent_reviewed_at: data.parentReviewedAt,
        parent_feedback: data.parentFeedback,
        parent_suggested_milestones: data.parentSuggestedMilestones,
        completion_timeline: data.completionTimeline,
      },
      $setOnInsert: {
        user_id: userId,
        goal_id: goalId,
      },
    },
    { upsert: true, new: true },
  ).lean();
  return withId(doc);
}
