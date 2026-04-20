# Dus App — Teen Social + Parent Portal

A mobile-first social platform for teens with a parent/educator portal for insights and guidance.

## Project Structure

```
dus-pastel-wave/
├── src/                    # Frontend (React + TypeScript)
│   ├── pages/             # Page components
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React contexts (Auth, UserRole)
│   ├── hooks/             # Custom hooks
│   └── utils/             # Utilities
├── server/                 # Backend (Node + Express + TypeScript)
│   ├── src/
│   │   ├── db.ts          # MongoDB + Mongoose models
│   │   ├── index.ts       # Express app entry
│   │   ├── middleware/    # Auth middleware
│   │   └── routes/        # API routes (auth, posts, parent-portal)
│   ├── .env               # Backend config (with MongoDB Atlas URI template)
│   └── .env.local         # Password storage (git-ignored)
├── supabase/              # Supabase Edge Functions
└── package.json           # Frontend dependencies
```

## Tech Stack

**Frontend:**
- Vite + React + TypeScript
- shadcn-ui + Tailwind CSS
- React Router for navigation

**Backend:**
- Node.js + Express + TypeScript
- MongoDB with Mongoose
- JWT for authentication
- Zod for request validation
- bcrypt for password hashing
- CORS for cross-origin requests

## Quick Start (Local Development)

### Prerequisites
- Node.js (v20+) & npm
- MongoDB Atlas account (free tier is fine)

## Frontend Setup

```bash
# Install dependencies
npm install

# Frontend runs on http://localhost:8080 (for development only)
npm run dev
```

**Environment Configuration:**
- `.env` — Production settings (committed to repo)
  - `VITE_API_BASE` defaults to `https://api.dus.app` (your production backend)
  
- `.env.local` — Local development overrides (git-ignored)
  - Create it to override `VITE_API_BASE` for local testing
  - Example: `VITE_API_BASE=http://localhost:4000`

### 2. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Copy backend env template
cp .env.example .env

# Create secure password file
cp .env.local.example .env.local

# Edit .env.local and add your MongoDB Atlas password:
# DB_PASSWORD=your_actual_password_here

# Start backend dev server (runs on http://localhost:4000)
npm run dev
```

### 3. Environment Configuration

**Backend `.env`** (committed to repo):
```
MONGODB_URI=mongodb+srv://mhakim:<db_password>@duscluster0.ssqycgq.mongodb.net/
MONGODB_DBNAME=dusapp
JWT_SECRET=devsecret
FRONTEND_ORIGIN=http://localhost:8080
PORT=4000
```

**Backend `.env.local`** (git-ignored, secure):
```
DB_PASSWORD=your_mongodb_atlas_password
```

The code automatically replaces `<db_password>` with the actual password from `.env.local`.

### 4. Access the App

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:4000/api/...
- **Health check**: `curl http://localhost:4000/api/health`

## API Endpoints

### Authentication
- `POST /api/auth/signup` — Create account (email, password, displayName)
- `POST /api/auth/login` — Login (email, password) → returns JWT token
- `GET /api/auth/me` — Get current user profile (requires Bearer token)

### Posts (Feed)
- `GET /api/posts` — Fetch recent posts (protected, auth required)
- `POST /api/posts` — Create post (protected, roles: teen/parent/educator/admin)

### Parent Portal
- `GET /api/parent-portal/overview` — Aggregated insights (protected, roles: parent/educator/admin)

## Authentication Flow

1. User signs up/logs in at frontend
2. Frontend calls `POST /api/auth/signup` or `POST /api/auth/login`
3. Backend verifies password (bcrypt) and returns JWT token + user profile
4. Frontend stores token in localStorage
5. Frontend includes `Authorization: Bearer <token>` in all protected requests
6. Backend validates JWT and enforces role-based access

## Development Workflow

### Adding a New Route

1. **Define Zod schema** in `server/src/routes/yourfeature.ts`:
   ```typescript
   const createSchema = z.object({
     field: z.string().min(1).max(100)
   });
   ```

2. **Use middleware** for auth/roles:
   ```typescript
   router.post('/', authMiddleware, requireRole(['teen', 'admin']), (req, res) => {
     const parsed = createSchema.safeParse(req.body);
     if (!parsed.success) return res.status(400).json({ error: 'Invalid' });
     // ...
   });
   ```

3. **From frontend**, call with token:
   ```typescript
   const res = await fetch(`${API_BASE}/api/yourfeature`, {
     method: 'POST',
     headers: { 
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify(data)
   });
   ```

## Deployment

### Frontend
- Build: `npm run build` → outputs to `dist/`
- Deploy to Vercel, Netlify, or any static host

### Backend
- Build: `cd server && npm run build` → outputs to `dist/`
- Deploy to Render, Railway, Fly.io, or any Node host
- Ensure env vars are set in your hosting platform

## Security Notes

- **Never commit `.env` or `.env.local`** — both are in `.gitignore`
- Roles are enforced server-side from verified JWT, not client-side localStorage
- All POST endpoints validate input with Zod before processing
- CORS is restricted to `FRONTEND_ORIGIN` in production
- Helmet.js security headers enabled
- Rate limiting on auth (10/15min), AI (5/min), uploads (10/min), and global (100/15min)
- HTTPS enforced in production via redirect middleware

## Compliance Checklist (Pre-Launch)

This app targets teens — these compliance items must be addressed before public launch:

- [ ] **COPPA**: Age verification for users under 13
- [ ] **Parental Consent**: Consent flow for minors
- [ ] **GDPR**: User data export/deletion endpoints
- [ ] **Privacy Policy**: Disclose AI processing (data sent to OpenAI)
- [ ] **CAN-SPAM**: Unsubscribe link in parent notification emails
- [ ] **Data Retention**: Policy for deleting archived goals and inactive accounts
- [ ] **PII Minimization**: Audit what personal data is collected vs. needed

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and test locally
3. Commit with clear messages: `git commit -m "Add feature: xyz"`
4. Push and open a PR

## Troubleshooting

**Backend won't start:**
- Check MongoDB URI in `.env` and password in `.env.local`
- Ensure `MONGODB_DBNAME` matches your actual database name

**Frontend can't reach backend:**
- Verify `VITE_API_BASE` in `.env` is `http://localhost:4000`
- Check CORS is not being blocked (browser console)
- Ensure backend is running on port 4000

**Auth failing:**
- Check JWT_SECRET is set consistently across env files
- Verify token is being sent in `Authorization: Bearer` header
- Check browser console for error messages

## License

Internal project for Dus App.
