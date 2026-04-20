import { MongoClient, ObjectId, Collection, Document } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const LEGACY_URI = process.env.LEGACY_MONGODB_URI!;
const TARGET_URI = process.env.MONGODB_URI!;
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 500;

// UUID -> ObjectId mapping per collection
const idMaps: Record<string, Map<string, ObjectId>> = {};

const summary: { collection: string; read: number; written: number; errors: number }[] = [];

function newId(collection: string, oldId: string): ObjectId {
  if (!idMaps[collection]) idMaps[collection] = new Map();
  if (!idMaps[collection].has(oldId)) {
    idMaps[collection].set(oldId, new ObjectId());
  }
  return idMaps[collection].get(oldId)!;
}

function mapRef(collection: string, oldId: string | null | undefined): ObjectId | null {
  if (!oldId) return null;
  return idMaps[collection]?.get(oldId) ?? null;
}

function toDate(val: unknown): Date | null {
  if (!val) return null;
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}

function toDateRequired(val: unknown): Date {
  return toDate(val) ?? new Date();
}

async function insertBatch(
  collection: Collection,
  docs: Document[],
  collectionName: string,
): Promise<{ written: number; errors: number }> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would insert ${docs.length} docs into ${collectionName}`);
    return { written: docs.length, errors: 0 };
  }

  let written = 0;
  let errors = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    try {
      const result = await collection.insertMany(batch, { ordered: false });
      written += result.insertedCount;
    } catch (err: any) {
      // With ordered:false, some docs may have inserted despite errors
      if (err.insertedCount != null) {
        written += err.insertedCount;
      }
      const failCount = batch.length - (err.insertedCount ?? 0);
      errors += failCount;
      console.error(`  Error in batch for ${collectionName}: ${failCount} docs failed - ${err.message}`);
    }
  }

  return { written, errors };
}

// ── Collection Migrators ──────────────────────────────────────────

async function migrateUsers(legacy: MongoClient, target: MongoClient) {
  const name = 'users';
  console.log(`\nMigrating ${name}...`);
  const docs = await legacy.db().collection(name).find({}).toArray();
  console.log(`  Read ${docs.length} docs from legacy`);

  const transformed = [];
  for (const doc of docs) {
    try {
      const id = doc.id ?? doc._id?.toString();
      transformed.push({
        _id: newId(name, id),
        auth_id: doc.auth_id ?? '',
        email: doc.email ?? '',
        role: doc.role ?? 'teen',
        display_name: doc.display_name ?? '',
        avatar_url: doc.avatar_url ?? null,
        cohort_code: doc.cohort_code ?? null,
        archetype: doc.archetype ?? null,
        interests: Array.isArray(doc.interests) ? doc.interests : [],
        coach_style: doc.coach_style ?? 'calm',
        reminder_windows: Array.isArray(doc.reminder_windows) ? doc.reminder_windows : [],
        parent_contact: doc.parent_contact ?? null,
        consent_flags: doc.consent_flags ?? null,
        social_ids: doc.social_ids ?? null,
        created_at: toDateRequired(doc.created_at),
        updated_at: toDateRequired(doc.updated_at),
      });
    } catch (err: any) {
      console.error(`  Skipping user doc: ${err.message}`);
    }
  }

  const result = await insertBatch(target.db().collection(name), transformed, name);
  summary.push({ collection: name, read: docs.length, ...result });
}

async function migrateGoals(legacy: MongoClient, target: MongoClient) {
  const name = 'goals';
  console.log(`\nMigrating ${name}...`);
  const docs = await legacy.db().collection(name).find({}).toArray();
  console.log(`  Read ${docs.length} docs from legacy`);

  const transformed = [];
  for (const doc of docs) {
    try {
      const id = doc.id ?? doc._id?.toString();
      transformed.push({
        _id: newId(name, id),
        user_id: mapRef('users', doc.user_id),
        title: doc.title ?? '',
        description: doc.description ?? null,
        category: doc.category ?? 'personal',
        progress: doc.progress ?? 0,
        completed: doc.completed ?? false,
        status: doc.status ?? 'active',
        planned_days: doc.planned_days ?? null,
        completed_dates: Array.isArray(doc.completed_dates)
          ? doc.completed_dates.map((d: unknown) => toDate(d)).filter(Boolean)
          : [],
        last_checkin: doc.last_checkin ?? null,
        micro_step: doc.micro_step ?? null,
        milestones: doc.milestones ?? [],
        source: doc.source ?? 'manual',
        suggestion_id: doc.suggestion_id ?? null,
        suggestion_title: doc.suggestion_title ?? null,
        adopted_at: toDate(doc.adopted_at),
        archetype_aligned: doc.archetype_aligned ?? false,
        reminder_window: doc.reminder_window ?? null,
        week_start: toDate(doc.week_start),
        resized: doc.resized ?? false,
        carried_over_from: mapRef(name, doc.carried_over_from),
        created_at: toDateRequired(doc.created_at),
        completed_at: toDate(doc.completed_at),
      });
    } catch (err: any) {
      console.error(`  Skipping goal doc: ${err.message}`);
    }
  }

  const result = await insertBatch(target.db().collection(name), transformed, name);
  summary.push({ collection: name, read: docs.length, ...result });
}

async function migrateCheckins(legacy: MongoClient, target: MongoClient) {
  const name = 'checkins';
  console.log(`\nMigrating ${name}...`);
  const docs = await legacy.db().collection(name).find({}).toArray();
  console.log(`  Read ${docs.length} docs from legacy`);

  const transformed = [];
  for (const doc of docs) {
    try {
      const id = doc.id ?? doc._id?.toString();
      transformed.push({
        _id: newId(name, id),
        user_id: mapRef('users', doc.user_id),
        goal_id: mapRef('goals', doc.goal_id),
        status: doc.status ?? '',
        date: toDateRequired(doc.date),
        note: doc.note ?? null,
        snoozes: doc.snoozes ?? 0,
      });
    } catch (err: any) {
      console.error(`  Skipping checkin doc: ${err.message}`);
    }
  }

  const result = await insertBatch(target.db().collection(name), transformed, name);
  summary.push({ collection: name, read: docs.length, ...result });
}

async function migrateAiGoalFeedbacks(legacy: MongoClient, target: MongoClient) {
  const name = 'ai_goal_feedbacks';
  console.log(`\nMigrating ${name}...`);
  const docs = await legacy.db().collection(name).find({}).toArray();
  console.log(`  Read ${docs.length} docs from legacy`);

  const transformed = [];
  for (const doc of docs) {
    try {
      const id = doc.id ?? doc._id?.toString();
      transformed.push({
        _id: newId(name, id),
        user_id: mapRef('users', doc.user_id),
        goal_id: mapRef('goals', doc.goal_id),
        completion_timeline: doc.completion_timeline ?? null,
        parent_reviewed: doc.parent_reviewed ?? false,
        parent_reviewed_at: toDate(doc.parent_reviewed_at),
        parent_feedback: doc.parent_feedback ?? null,
        parent_suggested_milestones: Array.isArray(doc.parent_suggested_milestones)
          ? doc.parent_suggested_milestones
          : [],
        completion_feedback: doc.completion_feedback ?? null,
        adoption_reason: doc.adoption_reason ?? null,
        milestones_completed: doc.milestones_completed ?? 0,
        last_milestone_completed_at: toDate(doc.last_milestone_completed_at),
        created_at: toDateRequired(doc.created_at),
      });
    } catch (err: any) {
      console.error(`  Skipping ai_goal_feedback doc: ${err.message}`);
    }
  }

  const result = await insertBatch(target.db().collection(name), transformed, name);
  summary.push({ collection: name, read: docs.length, ...result });
}

async function migratePosts(legacy: MongoClient, target: MongoClient) {
  const name = 'posts';
  console.log(`\nMigrating ${name}...`);
  const docs = await legacy.db().collection(name).find({}).toArray();
  console.log(`  Read ${docs.length} docs from legacy`);

  const transformed = [];
  for (const doc of docs) {
    try {
      const id = doc.id ?? doc._id?.toString();
      transformed.push({
        _id: newId(name, id),
        author_id: mapRef('users', doc.author_id),
        content: doc.content ?? null,
        media_type: doc.media_type ?? null,
        media_url: doc.media_url ?? null,
        visibility: doc.visibility ?? 'public',
        created_at: toDateRequired(doc.created_at),
      });
    } catch (err: any) {
      console.error(`  Skipping post doc: ${err.message}`);
    }
  }

  const result = await insertBatch(target.db().collection(name), transformed, name);
  summary.push({ collection: name, read: docs.length, ...result });
}

async function migrateComments(legacy: MongoClient, target: MongoClient) {
  const name = 'comments';
  console.log(`\nMigrating ${name}...`);
  const docs = await legacy.db().collection(name).find({}).toArray();
  console.log(`  Read ${docs.length} docs from legacy`);

  const transformed = [];
  for (const doc of docs) {
    try {
      const id = doc.id ?? doc._id?.toString();
      transformed.push({
        _id: newId(name, id),
        post_id: mapRef('posts', doc.post_id),
        author_id: mapRef('users', doc.author_id),
        text: doc.text ?? '',
        created_at: toDateRequired(doc.created_at),
      });
    } catch (err: any) {
      console.error(`  Skipping comment doc: ${err.message}`);
    }
  }

  const result = await insertBatch(target.db().collection(name), transformed, name);
  summary.push({ collection: name, read: docs.length, ...result });
}

async function migrateThreadsAndMembers(legacy: MongoClient, target: MongoClient) {
  const threadName = 'threads';
  const memberName = 'thread_members';
  console.log(`\nMigrating ${threadName} + ${memberName} (merged)...`);

  const threadDocs = await legacy.db().collection(threadName).find({}).toArray();
  const memberDocs = await legacy.db().collection(memberName).find({}).toArray();
  console.log(`  Read ${threadDocs.length} threads and ${memberDocs.length} thread_members from legacy`);

  // Group members by thread_id
  const membersByThread = new Map<string, Document[]>();
  for (const m of memberDocs) {
    const tid = m.thread_id;
    if (!tid) continue;
    if (!membersByThread.has(tid)) membersByThread.set(tid, []);
    membersByThread.get(tid)!.push(m);
  }

  const transformed = [];
  for (const doc of threadDocs) {
    try {
      const id = doc.id ?? doc._id?.toString();
      const threadOid = newId(threadName, id);

      // Build embedded members array
      const rawMembers = membersByThread.get(id) ?? [];
      const members = rawMembers.map((m) => ({
        _id: new ObjectId(),
        user_id: mapRef('users', m.user_id),
      }));

      transformed.push({
        _id: threadOid,
        type: doc.type ?? 'dm',
        title: doc.title ?? null,
        created_by: mapRef('users', doc.created_by),
        last_message: doc.last_message ?? null,
        last_message_at: toDateRequired(doc.last_message_at),
        read_by: doc.read_by ?? {},
        members,
        created_at: toDateRequired(doc.created_at),
        updated_at: toDateRequired(doc.updated_at),
      });
    } catch (err: any) {
      console.error(`  Skipping thread doc: ${err.message}`);
    }
  }

  const result = await insertBatch(target.db().collection(threadName), transformed, threadName);
  summary.push({ collection: `${threadName} (+ ${memberName} merged)`, read: threadDocs.length, ...result });
}

async function migrateMessages(legacy: MongoClient, target: MongoClient) {
  const name = 'messages';
  console.log(`\nMigrating ${name}...`);
  const docs = await legacy.db().collection(name).find({}).toArray();
  console.log(`  Read ${docs.length} docs from legacy`);

  const transformed = [];
  for (const doc of docs) {
    try {
      const id = doc.id ?? doc._id?.toString();
      transformed.push({
        _id: newId(name, id),
        thread_id: mapRef('threads', doc.thread_id),
        sender_id: mapRef('users', doc.sender_id),
        text: doc.text ?? '',
        attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
        created_at: toDateRequired(doc.created_at),
        read_by: Array.isArray(doc.read_by) ? doc.read_by : [],
      });
    } catch (err: any) {
      console.error(`  Skipping message doc: ${err.message}`);
    }
  }

  const result = await insertBatch(target.db().collection(name), transformed, name);
  summary.push({ collection: name, read: docs.length, ...result });
}

async function migrateParentChildLinks(legacy: MongoClient, target: MongoClient) {
  const name = 'parent_child_links';
  console.log(`\nMigrating ${name}...`);
  const docs = await legacy.db().collection(name).find({}).toArray();
  console.log(`  Read ${docs.length} docs from legacy`);

  const transformed = [];
  for (const doc of docs) {
    try {
      const id = doc.id ?? doc._id?.toString();
      transformed.push({
        _id: newId(name, id),
        parent_id: mapRef('users', doc.parent_id),
        child_id: mapRef('users', doc.child_id),
        created_at: toDateRequired(doc.created_at),
      });
    } catch (err: any) {
      console.error(`  Skipping parent_child_link doc: ${err.message}`);
    }
  }

  const result = await insertBatch(target.db().collection(name), transformed, name);
  summary.push({ collection: name, read: docs.length, ...result });
}

async function migrateSocialAuthTokens(legacy: MongoClient, target: MongoClient) {
  const name = 'social_auth_tokens';
  console.log(`\nMigrating ${name}...`);
  const docs = await legacy.db().collection(name).find({}).toArray();
  console.log(`  Read ${docs.length} docs from legacy`);

  const transformed = [];
  for (const doc of docs) {
    try {
      const id = doc.id ?? doc._id?.toString();
      transformed.push({
        _id: newId(name, id),
        user_id: mapRef('users', doc.user_id),
        platform: doc.platform ?? '',
        access_token: doc.access_token ?? '',
        refresh_token: doc.refresh_token ?? null,
        expires_at: toDate(doc.expires_at),
        social_user_id: doc.social_user_id ?? null,
        scope: doc.scope ?? null,
        profile: doc.profile ?? null,
        created_at: toDateRequired(doc.created_at),
        updated_at: toDateRequired(doc.updated_at),
      });
    } catch (err: any) {
      console.error(`  Skipping social_auth_token doc: ${err.message}`);
    }
  }

  const result = await insertBatch(target.db().collection(name), transformed, name);
  summary.push({ collection: name, read: docs.length, ...result });
}

async function migratePostCaches(legacy: MongoClient, target: MongoClient) {
  const name = 'post_caches';
  console.log(`\nMigrating ${name}...`);
  const docs = await legacy.db().collection(name).find({}).toArray();
  console.log(`  Read ${docs.length} docs from legacy`);

  const transformed = [];
  for (const doc of docs) {
    try {
      const id = doc.id ?? doc._id?.toString();
      transformed.push({
        _id: newId(name, id),
        user_id: mapRef('users', doc.user_id),
        platform: doc.platform ?? '',
        posts: doc.posts ?? [],
        fetched_at: toDateRequired(doc.fetched_at),
        expires_at: toDateRequired(doc.expires_at),
        created_at: toDateRequired(doc.created_at),
        updated_at: toDateRequired(doc.updated_at),
      });
    } catch (err: any) {
      console.error(`  Skipping post_cache doc: ${err.message}`);
    }
  }

  const result = await insertBatch(target.db().collection(name), transformed, name);
  summary.push({ collection: name, read: docs.length, ...result });
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  if (!LEGACY_URI) {
    console.error('Missing LEGACY_MONGODB_URI environment variable');
    process.exit(1);
  }
  if (!TARGET_URI) {
    console.error('Missing MONGODB_URI environment variable');
    process.exit(1);
  }

  console.log('=== DUS MongoDB Migration ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('');

  const legacy = new MongoClient(LEGACY_URI);
  const target = new MongoClient(TARGET_URI);

  try {
    console.log('Connecting to legacy MongoDB...');
    await legacy.connect();
    console.log('Connecting to target Atlas cluster...');
    await target.connect();

    // Migrate in dependency order
    await migrateUsers(legacy, target);
    await migrateGoals(legacy, target);
    await migrateCheckins(legacy, target);
    await migrateAiGoalFeedbacks(legacy, target);
    await migratePosts(legacy, target);
    await migrateComments(legacy, target);
    await migrateThreadsAndMembers(legacy, target);
    await migrateMessages(legacy, target);
    await migrateParentChildLinks(legacy, target);
    await migrateSocialAuthTokens(legacy, target);
    await migratePostCaches(legacy, target);

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log('');
    console.log('Collection'.padEnd(40) + 'Read'.padStart(8) + 'Written'.padStart(10) + 'Errors'.padStart(10));
    console.log('-'.repeat(68));
    let totalRead = 0;
    let totalWritten = 0;
    let totalErrors = 0;
    for (const s of summary) {
      console.log(
        s.collection.padEnd(40) +
          String(s.read).padStart(8) +
          String(s.written).padStart(10) +
          String(s.errors).padStart(10),
      );
      totalRead += s.read;
      totalWritten += s.written;
      totalErrors += s.errors;
    }
    console.log('-'.repeat(68));
    console.log(
      'TOTAL'.padEnd(40) +
        String(totalRead).padStart(8) +
        String(totalWritten).padStart(10) +
        String(totalErrors).padStart(10),
    );

    if (totalErrors > 0) {
      console.log(`\nWARNING: ${totalErrors} documents failed to migrate. Check logs above.`);
    }

    console.log('\nMigration complete.');
  } finally {
    await legacy.close();
    await target.close();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
