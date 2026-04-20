import mongoose from 'mongoose';
import { Reward } from '../models/reward.model';
import { Checkin, User } from '../models';
import type { RewardSource } from '../models/reward.model';

/**
 * Award a Mark for a yes check-in or goal completion.
 * Deduplicates on same source_id + same calendar day.
 * After creating, checks and potentially awards Moova.
 */
export async function awardMark(
  userId: string,
  sourceId: string,
  title: string,
): Promise<{ type: string; title: string } | null> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const existing = await Reward.findOne({
    user_id: new mongoose.Types.ObjectId(userId),
    type: 'mark',
    source_id: sourceId,
    earned_at: { $gte: todayStart, $lte: todayEnd },
  }).lean();

  if (existing) return null;

  await Reward.create({
    user_id: new mongoose.Types.ObjectId(userId),
    type: 'mark',
    title,
    source: 'goal_checkin' as RewardSource,
    source_id: sourceId,
    earned_at: new Date(),
  });

  await checkAndAwardMoova(userId);

  return { type: 'mark', title };
}

/**
 * Award a Moment for a challenge completion.
 * No deduplication — each challenge completion earns a fresh Moment.
 */
export async function awardMoment(
  userId: string,
  source: RewardSource,
  sourceId: string,
  title: string,
): Promise<{ type: string; title: string }> {
  await Reward.create({
    user_id: new mongoose.Types.ObjectId(userId),
    type: 'moment',
    title,
    source,
    source_id: sourceId,
    earned_at: new Date(),
  });

  return { type: 'moment', title };
}

/**
 * Check if user qualifies for Moova status:
 * >= 25 distinct yes-check-in days in the last 30 days.
 * Once earned, never revoked.
 */
export async function checkAndAwardMoova(userId: string): Promise<boolean> {
  const user = await User.findById(userId).select('is_moova').lean();
  if (user?.is_moova) return false;

  // Fetch last 35 distinct yes-check-in days (buffer beyond 30 in case of timezone edge)
  const thirtyFiveDaysAgo = new Date();
  thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

  const result = await Checkin.aggregate([
    {
      $match: {
        user_id: new mongoose.Types.ObjectId(userId),
        status: 'yes',
        date: { $gte: thirtyFiveDaysAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 35 },
  ]);

  if (result.length < 30) return false;

  // Walk the sorted-descending date strings and find the longest consecutive streak
  const dates = result.map((r) => r._id as string);
  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const curr = new Date(dates[i]);
    const prev = new Date(dates[i + 1]);
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / 86_400_000);
    if (diffDays === 1) {
      streak++;
      if (streak >= 30) break;
    } else {
      streak = 1;
    }
  }

  if (streak < 30) return false;

  const now = new Date();
  await User.findByIdAndUpdate(userId, {
    is_moova: true,
    moova_earned_at: now,
  });

  await Reward.create({
    user_id: new mongoose.Types.ObjectId(userId),
    type: 'moova',
    title: 'Moova unlocked.',
    source: 'consistency_30d' as RewardSource,
    earned_at: now,
  });

  return true;
}

/**
 * Get a user's reward summary.
 */
export async function getUserRewards(userId: string) {
  const userObjId = new mongoose.Types.ObjectId(userId);

  const [marks, moments, user] = await Promise.all([
    Reward.find({ user_id: userObjId, type: 'mark' })
      .sort({ earned_at: -1 })
      .limit(20)
      .lean(),
    Reward.find({ user_id: userObjId, type: 'moment' })
      .sort({ earned_at: -1 })
      .limit(10)
      .lean(),
    User.findById(userId).select('is_moova moova_earned_at').lean(),
  ]);

  const [totalMarksResult, totalMomentsResult] = await Promise.all([
    Reward.countDocuments({ user_id: userObjId, type: 'mark' }),
    Reward.countDocuments({ user_id: userObjId, type: 'moment' }),
  ]);

  return {
    marks: marks.map((r) => ({
      id: (r._id as any).toString(),
      title: r.title,
      earnedAt: r.earned_at.toISOString(),
      source: r.source,
    })),
    moments: moments.map((r) => ({
      id: (r._id as any).toString(),
      title: r.title,
      earnedAt: r.earned_at.toISOString(),
      source: r.source,
    })),
    totalMarks: totalMarksResult,
    totalMoments: totalMomentsResult,
    moova: user?.is_moova ?? false,
    moovaEarnedAt: user?.moova_earned_at ? (user.moova_earned_at as Date).toISOString() : null,
  };
}
