import { User } from '../models';
import { withId, withIds } from '../lib/mongo-helpers';

export async function findById(id: string) {
  const doc = await User.findById(id).lean();
  return withId(doc);
}

export async function findByAuthId(authId: string) {
  const doc = await User.findOne({ auth_id: authId }).lean();
  return withId(doc);
}

export async function findByEmail(email: string) {
  const doc = await User.findOne({ email }).lean();
  return withId(doc);
}

export async function findScoutByNickname(nickname: string, troopCode?: string) {
  const filter: Record<string, any> = {
    display_name: new RegExp(`^${nickname.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    is_scout_account: true,
  };
  if (troopCode) filter.troop_code = troopCode.toUpperCase();
  const doc = await User.findOne(filter).lean();
  return withId(doc);
}

export async function search(query: string, limit: number = 50) {
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = query
    ? {
        $or: [
          { display_name: new RegExp(safeQuery, 'i') },
          { cohort_code: new RegExp(safeQuery, 'i') },
        ],
      }
    : {};
  const docs = await User.find(filter)
    .select('display_name avatar_url role archetype interests created_at')
    .sort({ created_at: -1 })
    .limit(safeLimit)
    .lean();
  return withIds(docs);
}

export async function create(data: Record<string, any>) {
  const doc = await User.create(data);
  return { ...doc.toObject(), id: doc._id.toString() };
}

export async function update(id: string, data: Record<string, any>) {
  const doc = await User.findByIdAndUpdate(id, data, { new: true }).lean();
  return withId(doc);
}
