-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: jobs table
-- Stores job descriptions for matching against resumes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jobs (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT        NOT NULL,
    source      TEXT        DEFAULT 'manual',           -- e.g. 'manual', 'linkedin', 'indeed'
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "jobs:insert_own" ON public.jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "jobs:select_own" ON public.jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "jobs:delete_own" ON public.jobs
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs (user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: matches table
-- Stores the results of matching a resume against a specific job.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matches (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id        UUID        NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    job_id           UUID        NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    match_score      INTEGER     NOT NULL CHECK (match_score BETWEEN 0 AND 100),
    missing_skills   JSONB       NOT NULL DEFAULT '[]',
    strengths        TEXT[]      NOT NULL DEFAULT '{}',
    weaknesses       TEXT[]      NOT NULL DEFAULT '{}',
    suggestions      TEXT[]      NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "matches:insert_own" ON public.matches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "matches:select_own" ON public.matches
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "matches:delete_own" ON public.matches
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches (user_id);
CREATE INDEX IF NOT EXISTS idx_matches_resume_id ON public.matches (resume_id);
CREATE INDEX IF NOT EXISTS idx_matches_job_id ON public.matches (job_id);
