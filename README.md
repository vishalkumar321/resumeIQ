# ResumeIQ

![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Groq](https://img.shields.io/badge/AI-Groq-F55036?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase)

AI-powered resume optimizer and job application assistant.

🔗 **Live App:** [https://resume-iq-chi.vercel.app/](https://resume-iq-chi.vercel.app/)

---

## About The Project

Most resumes never reach a human recruiter. They are filtered out by Applicant Tracking Systems (ATS) that look for specific keywords and formatting. Job seekers often spend hours manually tailoring their resumes for every application, only to receive silence in return.

ResumeIQ solves this by putting the power of an expert recruiter in your hands. Using the Llama-3.3-70b model via Groq, it analyzes your resume against specific roles or job descriptions in seconds. It doesn't just give you a score; it rewrites your summary, quantifies your achievements, and injects the exact keywords you need to pass the filters.

Whether you are a fresh graduate entering a competitive market or a senior engineer looking for your next challenge, ResumeIQ helps you bridge the gap between "applied" and "interviewed."

## Features

| Category | Feature | Description |
| :--- | :--- | :--- |
| 📊 **Analysis** | **ATS Score Analysis** | Upload PDF resumes to get an instant fit score out of 100 with detailed suggestions. |
| ✍️ **Optimization** | **AI Resume Rewriter** | Two modes: Role-based analysis or direct Job Description matching via URL scraping. |
| 💼 **Job Search** | **Job Recommendations** | Personalized job links for LinkedIn, Indeed, and more based on your optimized profile. |
| 📈 **Tracking** | **Application Tracker** | A full Kanban board to manage your job pipeline from Saved to Offer. |
| 📊 **Progress** | **Career Pulse** | Track your ATS score history and skill improvements over time with visual charts. |
| 🔐 **Security** | **Cloud Sync & Auth** | Secure Email/Password and Google OAuth login to keep your resumes synced. |

## Tech Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | Modern UI framework and build tool |
| **Styling** | Tailwind CSS | Utility-first, responsive design system |
| **Backend** | Node.js + Express | REST API and server-side logic |
| **AI** | Groq (Llama-3.3-70b) | High-speed resume analysis and rewriting |
| **Database** | Supabase (PostgreSQL) | Scalable database for users and reports |
| **Auth** | Supabase Auth | Identity management and Google OAuth |
| **PDF** | Puppeteer | Headless Chrome for professional PDF generation |
| **Scraping** | Axios + Cheerio | Extracting JD content from job portal URLs |
| **Deployment** | Vercel & Render | Automated CI/CD for frontend and backend |

## Architecture Overview

```text
User → React Frontend (Vercel)
           ↓
Express API (Render)
      ↙        ↘
Groq AI      Supabase DB
(Rewrite)    (Store + Auth)
           ↓
Puppeteer (PDF Generation)
```

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (free tier)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vishalkumar321/resumeIQ.git
   cd resumeIQ
   ```

2. **Backend Setup**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Update .env with your Supabase and Groq keys
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../client
   npm install
   cp .env.example .env
   # Update VITE_API_URL to http://localhost:5000/api
   npm run dev
   ```

## Environment Variables

### Backend (`server/.env`)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
GROQ_API_KEY=your_groq_key
ALLOWED_ORIGINS=http://localhost:5173
PORT=5000
```

### Frontend (`client/.env`)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:5000/api
```

## Database Schema

```sql
-- Tables setup in Supabase PostgreSQL
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    report_name TEXT,
    role TEXT,
    job_description TEXT,
    resume_text TEXT,
    score INTEGER,
    strengths JSONB,
    weaknesses JSONB,
    suggestions JSONB,
    missing_keywords JSONB,
    optimized_resume JSONB, -- Stores full AI rewritten content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.tracker (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    company_name TEXT NOT NULL,
    job_role TEXT NOT NULL,
    status TEXT DEFAULT 'Saved', -- Saved, Applied, Interviewing, Offer, Rejected
    report_id UUID REFERENCES public.reports,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### Reports
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/report` | Create new analysis report |
| GET | `/api/report/history` | Get all reports for user |
| GET | `/api/report/:id` | Get single report details |
| POST | `/api/report/rewrite/:id` | Optimized rewrite (role-based) |
| POST | `/api/report/tailor/:id` | Tailor resume to Job URL |
| GET | `/api/report/download/:id` | Download optimized resume PDF |
| GET | `/api/report/jobs/:id` | Get tailored job recommendations |
| DELETE | `/api/report/:id` | Delete a report |

### Application Tracker
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/tracker` | List all applications |
| POST | `/api/tracker` | Add new job application |
| PATCH | `/api/tracker/:id` | Update status (Kanban move) |
| DELETE | `/api/tracker/:id` | Remove from tracker |
| GET | `/api/tracker/stats` | Get pipeline performance stats |

## Project Structure

```text
resumeIQ/
├── client/
│   ├── src/
│   │   ├── components/   # UI elements (Cards, Badges, Overlays)
│   │   ├── pages/        # Main route views
│   │   ├── services/     # Axios API configuration
│   │   └── context/      # Auth and UI state providers
│   └── vite.config.js
├── server/
│   ├── controllers/      # Route request/response logic
│   ├── routes/           # Endpoint definitions
│   ├── services/         # AI, PDF, Scraper, and Jobs logic
│   ├── middleware/        # JWT Verification & Rate Limiting
│   └── server.js
└── supabase/
    └── schema.sql        # Database migrations
```

## Pages & Routes

| Route | Page | Access |
| :--- | :--- | :--- |
| `/` | Landing | Public |
| `/signup` | Signup | Public |
| `/login` | Login | Public |
| `/dashboard` | Main Stats | Protected |
| `/history` | Resume Archive | Protected |
| `/report/:id` | Deep Analysis | Protected |
| `/tracker` | Kanban Board | Protected |
| `/profile` | User Settings | Protected |

## Key Design Decisions

- **Groq Llama-3.3-70b**: Chosen over OpenAI for its incredible speed (instant response) and generous free tier, allowing for real-time resume "chat" and rewrites.
- **Puppeteer PDF Engine**: Instead of using basic PDF libraries, the server uses Puppeteer to render a hidden, pixel-perfect HTML version of the optimized resume. This ensures the downloaded PDF matches the on-screen design exactly.
- **Supabase for Backend-as-a-Service**: Using Supabase allowed for a unified handling of PostgreSQL, JWT Authentication, and Google OAuth, significantly reducing boilerplate code.
- **Full-Screen Overlays**: Analysis results and the "Optimizer" use full-screen overlays to maintain user context without forced page navigations, creating a "software" feel rather than a "website" feel.
- **Durable Text Extraction**: Resume text is extracted once on upload and stored in PostgreSQL. This allows for side-by-side "Before vs After" comparisons even weeks after the original upload.

## What I Learned

This project pushed me to master prompt engineering to ensure LLMs consistently return strictly formatted JSON for complex tasks like resume restructuring. I also learned the nuances of running Puppeteer in production (Render/Vercel) and how to handle structured data transitions between raw PDF text and beautifully styled frontend components. Building the Kanban board tracker gave me deep insights into state management for drag-and-drop-like interfaces.

## Future Improvements

- **Auto-Apply Integration**: One-click application for supported platforms.
- **Resume Versioning**: Save and compare multiple AI optimization attempts.
- **Interview Prep**: AI-generated mock interview questions based on your specific resume gaps.
- **Agency Mode**: Allow recruiters to manage multiple candidates' profiles.
- **Mobile Companion**: Track application status notifications on the go.

## Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

**Vishal Kumar**  
GitHub: [@vishalkumar321](https://github.com/vishalkumar321)  
Project Link: [https://github.com/vishalkumar321/resumeIQ](https://github.com/vishalkumar321/resumeIQ)
