/**
 * Converts all ObjectId values in a lean document to strings, and adds `id` from `_id`.
 * Ensures compatibility with code that expects Prisma-style string IDs.
 */
function stringifyObjectIds(doc: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value && typeof value === 'object' && typeof value.toString === 'function' && value._bsontype === 'ObjectId') {
      result[key] = value.toString();
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function withId<T extends Record<string, any>>(doc: T): any;
export function withId<T extends Record<string, any>>(doc: T | null): any;
export function withId<T extends Record<string, any>>(doc: T | null): any {
  if (!doc) return null;
  const normalized = stringifyObjectIds(doc);
  normalized.id = String(doc._id);
  return normalized;
}

export function withIds<T extends Record<string, any>>(docs: T[]): any[] {
  return docs.map((doc) => withId(doc)!);
}
