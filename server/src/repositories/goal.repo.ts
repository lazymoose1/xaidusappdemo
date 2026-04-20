import { Goal } from '../models';
import { withId, withIds } from '../lib/mongo-helpers';

export async function findById(id: string) {
  const doc = await Goal.findById(id).lean();
  return withId(doc);
}

export async function findByUserId(userId: string) {
  const docs = await Goal.find({ user_id: userId }).sort({ created_at: -1 }).lean();
  return withIds(docs);
}

export async function findActiveByUserId(userId: string) {
  const docs = await Goal.find({ user_id: userId })
    .sort({ created_at: -1 })
    .lean();
  return withIds(docs.filter((d) => d.status !== 'archived'));
}

export async function create(data: Record<string, any>) {
  // Handle Prisma-style connect syntax: { user: { connect: { id } } }
  const mapped: Record<string, any> = { ...data };
  if (data.user?.connect?.id) {
    mapped.user_id = data.user.connect.id;
    delete mapped.user;
  }
  const doc = await Goal.create(mapped);
  return { ...doc.toObject(), id: doc._id.toString() };
}

export async function update(id: string, data: Record<string, any>) {
  const doc = await Goal.findByIdAndUpdate(id, data, { new: true }).lean();
  return withId(doc);
}

export function remove(id: string) {
  return Goal.findByIdAndDelete(id);
}

export async function addMilestone(
  id: string,
  milestone: { title: string; target: string; createdAt: Date },
) {
  const doc = await Goal.findByIdAndUpdate(
    id,
    { $push: { milestones: milestone } },
    { new: true },
  ).lean();
  return withId(doc);
}

export function updateByUser(id: string, userId: string, data: Record<string, any>) {
  return Goal.updateMany({ _id: id, user_id: userId }, data);
}

export async function findByUserIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  const results = await Promise.all(
    userIds.map((id) => Goal.find({ user_id: id }).sort({ created_at: -1 }).lean()),
  );
  return withIds(results.flat());
}

export async function findIncompleteGoals(limit: number = 100) {
  const docs = await Goal.find({ completed: false }).limit(limit).lean();
  return withIds(docs);
}
