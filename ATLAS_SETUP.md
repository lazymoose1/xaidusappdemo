# MongoDB Atlas + Render Setup Guide

## 1. MongoDB Atlas Setup

### Create 3 Projects
- **DUS-Dev**: Free M0 cluster, us-east-1, database name: `dus`
- **DUS-Staging**: M0 or M10 cluster, us-east-1, database name: `dus`
- **DUS-Prod**: M10+ cluster, us-east-1, database name: `dus`

### Database Users (per project)
- `dus_app_user` -- readWrite on `dus` database
- `dus_migration_user` -- dbAdmin + readWrite (temporary, revoke after migration)

### Network Access
- Add Render outbound IPs (find in Render dashboard > Outbound IPs)
- Add developer IPs for local development
- TLS 1.3 enforced (Atlas default)

### Connection String Pattern

```
mongodb+srv://dus_app_user:<password>@<cluster>.mongodb.net/dus?retryWrites=true&w=majority
```

## 2. Render Backend (Web Service)

### Configuration
- **Root Directory**: `server`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/index.js`
- **Environment**: Node
- **Auto-Deploy**: Yes (from main branch)
- **Health Check Path**: `/health`

### Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `FRONTEND_ORIGIN` | Render Static Site URL |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render default) |
| `SYSTEM_API_KEY` | Random 32+ char string |
| `TOKEN_ENCRYPTION_KEY` | Random 64 hex string |
| `OPENAI_API_KEY` | OpenAI API key |

## 3. Render Frontend (Static Site)

### Configuration
- **Root Directory**: `.` (project root)
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Auto-Deploy**: Yes (from main branch)

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_BASE` | Backend Render URL (e.g., https://dus-api.onrender.com) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |

## 4. Branch Strategy

| Branch | Deploys To | Atlas Project |
|---|---|---|
| `main` | Production | DUS-Prod |
| `staging` | Staging | DUS-Staging |
| `develop` | Dev | DUS-Dev |

## 5. Data Migration

Run migration from legacy MongoDB to Atlas dev cluster first:

```bash
cd server
# Dry run first to preview
LEGACY_MONGODB_URI="mongodb://..." MONGODB_URI="mongodb+srv://..." npx ts-node scripts/migrate-to-atlas.ts --dry-run

# Review output, then run live
LEGACY_MONGODB_URI="mongodb://..." MONGODB_URI="mongodb+srv://..." npx ts-node scripts/migrate-to-atlas.ts
```

### Migration Order
1. Dev cluster first (test everything)
2. Staging cluster
3. Production cluster (only after dev+staging verified)

## 6. Post-Migration Checklist

- [ ] Disable `dus_migration_user` on each Atlas project
- [ ] Verify IP allowlists are minimal
- [ ] Test all auth flows
- [ ] Test CRUD for goals, posts, threads
- [ ] Verify parent portal access
- [ ] Check rate limiting works
- [ ] Monitor Atlas metrics dashboard
