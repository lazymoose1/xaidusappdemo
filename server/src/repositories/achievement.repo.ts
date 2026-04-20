import { Goal } from '../models';
import { withIds } from '../lib/mongo-helpers';

/** Helper: get all goals for a user (used to compute achievements) */
export async function findGoalsByUserId(userId: string) {
  const docs = await Goal.find({ user_id: userId }).lean();
  return withIds(docs);
}

/** Helper: count completed goals */
export function countCompletedGoals(userId: string) {
  return Goal.countDocuments({ user_id: userId, completed: true });
}
