import { Thread } from '../models';
import { withId, withIds } from '../lib/mongo-helpers';

export async function findByUserId(userId: string) {
  const docs = await Thread.find({ 'members.user_id': userId })
    .sort({ last_message_at: -1, updated_at: -1 })
    .lean();
  return withIds(docs);
}

export async function findById(id: string) {
  const doc = await Thread.findById(id).lean();
  return withId(doc);
}

export async function create(data: {
  type: string;
  title: string;
  createdBy: string | null;
  memberIds: string[];
}) {
  const doc = await Thread.create({
    type: data.type,
    title: data.title,
    created_by: data.createdBy,
    last_message_at: new Date(),
    read_by: data.createdBy ? { [data.createdBy]: new Date().toISOString() } : {},
    members: data.memberIds.map((uid) => ({ user_id: uid })),
  });
  return { ...doc.toObject(), id: doc._id.toString() };
}

export async function update(id: string, data: Record<string, any>) {
  const doc = await Thread.findByIdAndUpdate(id, data, { new: true }).lean();
  return withId(doc);
}

export async function addMember(threadId: string, userId: string) {
  const doc = await Thread.findByIdAndUpdate(
    threadId,
    { $addToSet: { members: { user_id: userId } } },
    { new: true },
  ).lean();
  return withId(doc);
}

export async function findDmThread(userIdA: string, userIdB: string) {
  const doc = await Thread.findOne({
    type: 'dm',
    'members.user_id': { $all: [userIdA, userIdB] },
    members: { $size: 2 },
  }).lean();
  return withId(doc);
}
