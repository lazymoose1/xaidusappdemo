# Dus API — Backend Server

Express + TypeScript backend for the Dus teen social app. Handles authentication, posts, and parent portal insights.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env

# 3. Create secure password file (git-ignored)
cp .env.local.example .env.local

# 4. Edit .env.local and add your MongoDB Atlas password:
#    DB_PASSWORD=your_actual_password_here

# 5. Start dev server (runs on http://localhost:4000)
npm run dev
```

## Environment Configuration

### `.env` (committed to repo)
```
MONGODB_URI=mongodb+srv://mhakim:<db_password>@duscluster0.ssqycgq.mongodb.net/
MONGO_URI=${MONGODB_URI}
MONGODB_DBNAME=dusapp
JWT_SECRET=devsecret
FRONTEND_ORIGIN=http://localhost:8080
PORT=4000

# OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Security
TOKEN_ENCRYPTION_KEY=generate_32_char_random_key_here
SESSION_SECRET=your_session_secret_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Cache Configuration
CACHE_CRON_ENABLED=true
CACHE_CRON_INTERVAL="0 */2 * * *"
CACHE_CLEANUP_INTERVAL="0 0 * * *"
CACHE_BATCH_SIZE=50
CACHE_DELAY_MS=2000
CACHE_RUN_ON_STARTUP=true

# OAuth Callback URL
OAUTH_CALLBACK_BASE=https://your-dus-wave-domain.com
```

### `.env.local` (git-ignored, DO NOT COMMIT)
```
DB_PASSWORD=your_mongodb_atlas_password
```

**How it works:**
- The code loads `.env` first (has the URI template with `<db_password>` placeholder)
- Then loads `.env.local` (overrides with actual password)
- Replaces `<db_password>` in the URI with the password from `.env.local`
- Connects to MongoDB Atlas securely

## Project Structure

```
src/
├── db.ts              # Mongoose connection & models (User, Post, Goal, Comment)
├── index.ts           # Express app, CORS, routes setup
├── middleware/
│   └── auth.ts        # JWT verification & role checking
└── routes/
    ├── auth.ts        # Login, signup, me endpoints
    ├── posts.ts       # Feed posts CRUD
    └── parentPortal.ts # Parent/educator insights
```

## API Endpoints

### Health
- `GET /api/health` → `{ status: "ok" }`

### Authentication
- `POST /api/auth/signup`
  - Body: `{ email, password, displayName? }`
  - Returns: `{ token, user: { id, email, role, displayName } }`
  - Role defaults to "teen"

- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Returns: `{ token, user: { id, email, role, displayName } }`

- `GET /api/auth/me`
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ id, email, role, displayName, avatarUrl }`

### Posts
- `GET /api/posts`
  - Headers: `Authorization: Bearer <token>`
  - Returns: Array of recent posts (sorted by createdAt desc, limit 50)

- `POST /api/posts`
  - Headers: `Authorization: Bearer <token>`
  - Allowed roles: teen, parent, educator, admin
  - Body: `{ content (1-1000 chars), mediaType?, mediaUrl?, visibility? }`
  - Returns: Created post object

### Parent Portal
- `GET /api/parent-portal/overview`
  - Headers: `Authorization: Bearer <token>`
  - Allowed roles: parent, educator, admin
  - Returns: Mock aggregated insights (totalPostsLast30Days, activityByTimeBand, topTopics)

### Social Scraper + AI Mentor
- `GET /api/oauth/{provider}` — Start OAuth for twitter, linkedin, facebook/instagram, google (requires user JWT; stores code verifier + state in secure session)
- `GET /api/oauth/{provider}/callback` — Handles provider callback and securely encrypts tokens server-side (AES-256)
- `POST /api/ask` — AI mentor that pulls cached or live social posts to tailor guidance (requires JWT)
- `GET /api/metrics/health` — Combined cache + social-auth health
- `GET /api/metrics/cache` — Cache stats
- `GET /api/metrics/social-auth` — Social connection stats

## Key Features

### Authentication
- JWT-based with 1-hour expiration
- Passwords hashed with bcrypt (10 rounds)
- Roles enforced server-side from verified JWT

### Validation
- All POST endpoints use Zod for request validation
- Generic error responses (no info leakage)
- Configurable field length limits (e.g., content max 1000 chars)

### Middleware
- `authMiddleware` — Verifies JWT and attaches `req.user = { userId, role }`
- `requireRole(roles)` — Returns 403 if user role not in allowed list
- `express-session` + `connect-mongo` — Stores PKCE + OAuth state in HttpOnly cookies; encrypts session data at rest

### CORS
- Allows only `FRONTEND_ORIGIN` (http://localhost:8080 in dev, production URL in prod)
- Allows requests without origin (e.g., curl, Postman)

### Social Integrations, Cache, and Metrics
- OAuth flows require existing JWT, use PKCE + state, and keep tokens encrypted (`TOKEN_ENCRYPTION_KEY`) in the `socialAuth` collection
- Post caching (`postCache` collection) refreshes via cron (2h default) and supports manual refresh via `/api/metrics/cache/refresh`
- AI mentor `/api/ask` fetches profile + posts server-side only; responds with strict JSON (no tokens ever leave the API)
- Metrics endpoints expose aggregate counts only (no PII)

## Scripts

```bash
npm run dev     # Start with ts-node-dev (auto-reload)
npm run build   # Compile TypeScript to dist/
npm start       # Run compiled dist/index.js
npm run populate-test-user # Interactive helper to seed encrypted social tokens
```

## Database Schema

Models are defined in `src/db.ts` and map to existing MongoDB collections:

### User
- `_id` (ObjectId)
- `email` (string, indexed)
- `passwordHash` (bcrypt hash)
- `role` (string: "teen" | "parent" | "educator" | "admin")
- `displayName` (string)
- `avatarUrl` (string)
- `createdAt` (Date)

### Post
- `_id` (ObjectId)
- `authorId` (ObjectId, ref: User)
- `content` (string)
- `mediaType` (string)
- `mediaUrl` (string)
- `visibility` (string)
- `createdAt` (Date)

### Goal
- `_id` (ObjectId)
- `userId` (ObjectId, ref: User)
- `goalText` (string)
- `status` (string)
- `createdAt` (Date)

### Comment
- `_id` (ObjectId)
- `postId` (ObjectId, ref: Post)
- `authorId` (ObjectId, ref: User)
- `text` (string)
- `createdAt` (Date)

## Testing

Quick smoke test using curl:

```bash
# Health
curl http://localhost:4000/api/health

# Signup
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@local","password":"password123","displayName":"Test"}'

# Login (get token)
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@local","password":"password123"}' | jq -r .token)

# Get me (requires token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/auth/me

# Get posts (requires token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/posts

# Create post (requires token, teen+ role)
curl -X POST http://localhost:4000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"My first post!","visibility":"public"}'
```

## Deployment

### Build
```bash
npm run build
```

Outputs compiled TypeScript to `dist/`.

### Environment Variables (Production)
Set these in your hosting platform (Render, Railway, Fly.io, etc.):
- `MONGODB_URI` — Full connection string with password included
- `MONGODB_DBNAME` — Database name
- `JWT_SECRET` — Strong random secret (use a key management service)
- `FRONTEND_ORIGIN` — Your production frontend URL (e.g., https://dus.app)
- `PORT` — Port (usually 4000 or auto-assigned)
- `NODE_ENV` — "production"
- `OPENAI_API_KEY` — Optional: enable OpenAI-powered goal advice (otherwise mocked)
 - `SUPABASE_URL` — Base URL for Supabase project
 - `SUPABASE_ANON_KEY` — Anon or service key for functions
 - `SUPABASE_FUNCTION_TINY` — Name of the tiny AI function (default: tiny-ai)

### Start
```bash
npm start
```

## Security Checklist

- [ ] `.env.local` is git-ignored (contains password)
- [ ] `JWT_SECRET` is strong and unique
- [ ] `FRONTEND_ORIGIN` is set correctly for your domain
- [ ] All POST routes validate with Zod
- [ ] CORS is restricted to your frontend domain
- [ ] Passwords are hashed before storage (bcrypt)
- [ ] Roles are verified server-side, never trusted from client
- [ ] `TOKEN_ENCRYPTION_KEY` is 32+ chars; OAuth tokens never leave the server
- [ ] Session cookies are HttpOnly/Secure with `SESSION_SECRET` set
- [ ] OpenAI key set in env (never in frontend/localStorage)

## Troubleshooting

**MongoDB connection fails:**
- Check `MONGODB_URI` format is valid
- Check `DB_PASSWORD` in `.env.local` is correct
- Check MongoDB Atlas allows your IP

**Auth endpoints return 400:**
- Check request body matches Zod schema (email format, password min 6 chars)
- Check Content-Type header is `application/json`

**JWT token invalid:**
- Check `JWT_SECRET` is the same in `.env`
- Check token is included in `Authorization: Bearer <token>` header
- Check token hasn't expired (1 hour)

## Next Steps

- Add integration tests (Jest + Supertest)
- Add refresh token flow
- Add rate limiting
- Add structured logging (Pino/Winston)
- Add goals and comments endpoints
- Add file upload for avatars/media

## Social SSO Configuration

Buttons on the frontend `AuthPage` call `/api/auth/{provider}/login`. The backend handles the OAuth flow and redirects back to the frontend with a JWT.

### Supported providers and routes
- `amazon`: `/api/auth/amazon/login` → callback `/api/auth/amazon/callback`
- `snapchat`: `/api/auth/snapchat/login` → callback `/api/auth/snapchat/callback`
- `google` (used for YouTube SSO): `/api/auth/google/login` → callback `/api/auth/google/callback`
- `facebook`: `/api/auth/facebook/login` → callback `/api/auth/facebook/callback`
- `twitter` (used for X.com SSO): `/api/auth/twitter/login` → callback `/api/auth/twitter/callback`
- `linkedin`: `/api/auth/linkedin/login` → callback `/api/auth/linkedin/callback`

On successful OAuth, the server issues a JWT and redirects to:
`{FRONTEND_ORIGIN}/onboarding?token=...`

### Required environment variables
Set these in your environment or `.env` file:

```
PORT=4000
JWT_SECRET=your-dev-secret
API_BASE_URL=http://localhost:4000
FRONTEND_ORIGIN=http://localhost:5173

# Google (YouTube)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Facebook (covers Instagram via Facebook Login)
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...

# Twitter (X.com)
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...

# LinkedIn
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...

# Amazon
AMAZON_CLIENT_ID=...
AMAZON_CLIENT_SECRET=...

# Snapchat
SNAPCHAT_CLIENT_ID=...
SNAPCHAT_CLIENT_SECRET=...
```

### Local development quick start

1. Install deps and run the server:

```zsh
cd server
npm install
JWT_SECRET=devsecret API_BASE_URL=http://localhost:4000 FRONTEND_ORIGIN=http://localhost:5173 \
GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... \
FACEBOOK_CLIENT_ID=... FACEBOOK_CLIENT_SECRET=... \
TWITTER_CLIENT_ID=... TWITTER_CLIENT_SECRET=... \
LINKEDIN_CLIENT_ID=... LINKEDIN_CLIENT_SECRET=... \
AMAZON_CLIENT_ID=... AMAZON_CLIENT_SECRET=... \
SNAPCHAT_CLIENT_ID=... SNAPCHAT_CLIENT_SECRET=... \
npm run dev

# Optional: tiny AI function envs
# export SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_FUNCTION_TINY=tiny-ai
```

2. From the app, click a provider button on the sign-up page. You should be redirected to the provider, then back to `/onboarding` with a token.

### Notes
- YouTube SSO uses Google OAuth. Use the Google provider button for YouTube.
- X.com SSO uses the Twitter OAuth strategy.
- Instagram’s official login is handled via Facebook Login; direct Instagram OAuth is limited. Use the Facebook provider if you need Instagram-linked accounts.
