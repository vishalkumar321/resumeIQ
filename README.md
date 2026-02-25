# ResumeIQ — AI-Powered ATS Resume Optimizer

> Upload your resume. Get an instant AI analysis with scores, strengths, gaps, and actionable suggestions.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-resume--iq--chi.vercel.app-6366f1?style=flat-square)](https://resume-iq-chi.vercel.app)
[![Backend](https://img.shields.io/badge/API-Render-46e3b7?style=flat-square)](https://resumeiq-backend-lhh4.onrender.com/health)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](./LICENSE)

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | [resume-iq-chi.vercel.app](https://resume-iq-chi.vercel.app) |
| Backend API | [resumeiq-backend-lhh4.onrender.com](https://resumeiq-backend-lhh4.onrender.com/health) |

---

## Screenshots

| Dashboard | Report | History |
|---|---|---|
| ![Dashboard](./screenshots/dashboard.png) | ![Report](./screenshots/report.png) | ![History](./screenshots/history.png) |

---

## Features

- 📄 **PDF Resume Upload** — text-based, max 5 MB
- 🎯 **Role Analysis** — score your resume against a target role (e.g., Full Stack Developer)
- 📋 **JD Match** — paste a job description and get a match score + missing keywords
- 📊 **ATS Score + Strengths / Weaknesses / Suggestions**
- 🔒 **Auth** — email verification, forgot/reset/change password
- 📁 **Report History** — view, download PDF, or delete past reports
- ⬇️ **PDF Export** — download any report as a formatted single-page PDF
- 🛡️ **Rate Limiting** — 10 AI reports per day per user

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Axios, React Router v7 |
| **Backend** | Node.js, Express 5 |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage |
| **Auth** | Supabase Auth (JWT) |
| **AI** | Groq API (Llama 3) |
| **PDF Generation** | PDFKit |
| **Security** | Helmet, express-rate-limit, Zod validation |
| **Deployment** | Vercel (frontend) · Render (backend) |

---

## System Architecture

```
User Browser (React)
    │
    │ HTTPS + JWT (Authorization header)
    ▼
Express API (Render)
    ├── verifyUser middleware
    │       └── Supabase.auth.getUser(JWT) → user object + RLS-scoped client
    │
    ├── POST /api/resume/upload
    │       ├── Multer — parse multipart PDF
    │       ├── Supabase Storage — store at {userId}/{timestamp}-file.pdf
    │       └── Supabase DB — insert row into resumes table
    │
    └── POST /api/report/generate
            ├── Check daily limit (SELECT COUNT from reports, RLS-filtered)
            ├── Fetch resume row (RLS enforced)
            ├── Supabase Storage — download PDF blob
            ├── pdf-parse — extract plain text
            ├── Groq API — AI analysis (role or JD prompt)
            ├── Validate AI JSON response shape
            └── Supabase DB — insert row into reports table
```

---

## Folder Structure

```
resumeiq/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # UploadBox, ProtectedRoute
│   │   ├── pages/           # Dashboard, History, ReportDetail, Settings, Login...
│   │   ├── services/        # api.js (axios), pdf.js (download)
│   │   └── main.jsx         # Router setup
│   ├── vercel.json          # SPA rewrite rule
│   └── .env.example
│
├── server/                  # Express backend
│   ├── controllers/         # auth, resume, report
│   ├── middleware/          # auth, validate, error, rateLimit, async
│   ├── routes/              # auth.routes, resume.routes, report.routes
│   ├── schemas/             # Zod schemas (auth, report)
│   ├── services/            # supabase.js, ai.service.js, pdf.service.js, report.pdf.service.js
│   ├── utils/               # ApiError, response, validateEnv
│   └── server.js
│
└── supabase/
    └── schema.sql           # Full production schema (tables + RLS + storage)
```

---

## Database Schema

### `resumes`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → auth.users (ON DELETE CASCADE) |
| `file_path` | TEXT | Storage path: `{userId}/{timestamp}-file.pdf` |
| `created_at` | TIMESTAMPTZ | Auto |

### `reports`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → auth.users |
| `resume_id` | UUID | FK → resumes |
| `analysis_type` | TEXT | `'role'` or `'jd'` |
| `role` | TEXT | Filled when type = role |
| `score` | INTEGER | 0–100 ATS score |
| `match_score` | INTEGER | 0–100, JD mode only |
| `strengths` | TEXT[] | Max 5 items |
| `weaknesses` | TEXT[] | Max 5 items |
| `suggestions` | TEXT[] | Max 5 items |
| `missing_keywords` | TEXT[] | JD mode only, max 10 |
| `job_description` | TEXT | JD mode only |
| `created_at` | TIMESTAMPTZ | Auto |

> Full schema with RLS policies and storage bucket setup: [`supabase/schema.sql`](./supabase/schema.sql)

---

## Security Architecture

### JWT Authentication Flow
```
1. User logs in → Supabase returns JWT access token
2. Client stores token in localStorage
3. Every API request: Authorization: Bearer <token>
4. verifyUser middleware calls supabase.auth.getUser(token):
   - Valid  → creates RLS-scoped supabase client (req.supabase)
   - Invalid → 401 Unauthorized
5. All DB queries use req.supabase → RLS enforces user isolation
```

### Row Level Security (RLS)
Every table has RLS enabled. Each policy uses `auth.uid() = user_id`:
- Users can only `SELECT`, `INSERT`, `DELETE` their own rows
- No row from another user is ever returned, even with a valid JWT
- Same for Storage objects: path prefix checked against `auth.uid()`

### Additional Layers
| Protection | Implementation |
|---|---|
| CORS | Whitelist of exact origins only |
| Security headers | `helmet` (CSP, HSTS, X-Frame-Options…) |
| Request validation | Zod schemas on every route |
| Rate limiting | General: 100 req/15min · Auth: 20 req/15min · AI: 10 req/day |
| Input size | 1 MB JSON · 5 MB file upload |
| Password rules | Min 8 chars, uppercase, lowercase, number, special char |

---

## Environment Variables

### `server/.env`
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

JWT_SECRET=your_32_char_random_secret

GROQ_API_KEY=gsk_your_groq_key

PORT=5000
ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

### `client/.env`
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:5000/api
```

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key

### 1. Clone & install
```bash
git clone https://github.com/vishalkumar321/resumeIQ.git
cd resumeiq

# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 2. Configure environment
```bash
# Copy examples and fill in values
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 3. Set up Supabase
Run the full [`supabase/schema.sql`](./supabase/schema.sql) in your Supabase SQL Editor.
This creates tables, RLS policies, storage bucket, and storage policies.

### 4. Start development servers
```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

---

## Production Deployment

### Backend → Render
| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Environment | Set all 7 vars from `server/.env` |

### Frontend → Vercel
| Setting | Value |
|---|---|
| Root Directory | `client` |
| Framework Preset | Vite (auto-detected) |
| Environment | Set 3 vars from `client/.env` |

> `client/vercel.json` handles SPA routing automatically — no manual configuration needed.

After deploying frontend, update `ALLOWED_ORIGINS` and `FRONTEND_URL` in Render to your Vercel URL.

---

## How Email Verification Works

```
1. User signs up → POST /api/auth/signup
2. Server calls supabase.auth.signUp() with emailRedirectTo: FRONTEND_URL/login?verified=true
3. Supabase sends verification email to user
4. User clicks link → redirected to /login?verified=true
5. Login page shows "Email verified" banner
6. Login call checks email_confirmed_at — unverified users get 403
```

---

## How JD Match Works

The AI receives two inputs: extracted resume text + the pasted job description.
The system prompt instructs the model (Llama 3 via Groq) to act as an ATS scanner and return strict JSON:

```json
{
  "score": 60,
  "match_score": 40,
  "strengths": [...],
  "weaknesses": [...],
  "suggestions": [...],
  "missing_keywords": ["Node.js", "Docker", ...]
}
```

- **ATS score** — how well the resume is formatted/optimised generally
- **Match score** — how specifically the resume targets the given JD
- **Missing keywords** — terms in the JD not found in the resume

The controller validates the shape before persisting. Invalid responses return a 502.

---

## Rate Limiting & Usage Protection

| Limiter | Scope | Limit |
|---|---|---|
| General | All routes | 100 req / 15 min |
| Auth | `/api/auth/*` | 20 req / 15 min |
| AI | Report generation | 10 req / 24 h (per user, stored in DB) |

The daily AI limit is enforced server-side by counting the user's reports created since midnight UTC. This is RLS-scoped so users cannot spoof other users' counts.

---

## API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/signup` | No | Register + send verification email |
| POST | `/login` | No | Login, returns JWT |
| POST | `/forgot-password` | No | Send reset email |
| POST | `/change-password` | Yes | Update password |

### Resume — `/api/resume`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/upload` | Yes | Upload PDF, store in Supabase Storage |

### Report — `/api/report`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/generate` | Yes | Run AI analysis, save report |
| GET | `/history` | Yes | List all user reports |
| GET | `/:id` | Yes | Get single report |
| GET | `/:id/pdf` | Yes | Download report as PDF |
| DELETE | `/:id` | Yes | Delete report |

---

## Future Improvements

- [ ] LinkedIn profile import
- [ ] Resume rewriting suggestions (auto-rewrite mode)
- [ ] Multiple resume management (save and switch between resumes)
- [ ] Team / recruiter view for comparing candidate scores
- [ ] Stripe subscription for higher daily limits
- [ ] OAuth login (Google, GitHub)
- [ ] Mobile app (React Native)

---

## License

MIT © [Vishal Kumar](https://github.com/vishalkumar321)
