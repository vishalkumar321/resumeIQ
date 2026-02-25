-- ═══════════════════════════════════════════════════════════════════════════
-- ResumeIQ — Production Database Schema
-- Run this ENTIRE script in Supabase SQL Editor (all at once).
-- It is idempotent: safe to run multiple times via DROP IF EXISTS guards.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Drop existing tables (CASCADE removes dependent RLS policies too)
-- Order matters: reports depends on resumes
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.reports  CASCADE;
DROP TABLE IF EXISTS public.resumes  CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: resumes table
-- Stores file metadata for each uploaded resume PDF.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.resumes (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_path   TEXT        NOT NULL,                   -- e.g. "{user_id}/{timestamp}-file.pdf"
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own rows
CREATE POLICY "resumes:insert_own" ON public.resumes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "resumes:select_own" ON public.resumes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "resumes:delete_own" ON public.resumes
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_resumes_user_id ON public.resumes (user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: reports table
-- Stores each AI analysis result linked to a resume.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.reports (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id          UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
    resume_id        UUID        NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    analysis_type    TEXT        NOT NULL CHECK (analysis_type IN ('role', 'jd')),
    role             TEXT,                              -- filled when analysis_type = 'role'
    score            INTEGER     NOT NULL CHECK (score BETWEEN 0 AND 100),
    match_score      INTEGER     CHECK (match_score BETWEEN 0 AND 100), -- filled when analysis_type = 'jd'
    strengths        TEXT[]      NOT NULL DEFAULT '{}',
    weaknesses       TEXT[]      NOT NULL DEFAULT '{}',
    suggestions      TEXT[]      NOT NULL DEFAULT '{}',
    missing_keywords TEXT[],                            -- filled when analysis_type = 'jd'
    job_description  TEXT,                              -- filled when analysis_type = 'jd'
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own rows
CREATE POLICY "reports:insert_own" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reports:select_own" ON public.reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reports:delete_own" ON public.reports
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_reports_user_id      ON public.reports (user_id);
CREATE INDEX idx_reports_resume_id    ON public.reports (resume_id);
CREATE INDEX idx_reports_created_at   ON public.reports (created_at DESC);
CREATE INDEX idx_reports_user_created ON public.reports (user_id, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Storage bucket
-- Private bucket for PDF resume uploads (max 5 MB, PDF only).
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resumes',
    'resumes',
    false,                           -- private: never publicly accessible
    5242880,                         -- 5 MB limit
    ARRAY['application/pdf']         -- PDF only
)
ON CONFLICT (id) DO UPDATE SET
    public             = false,
    file_size_limit    = 5242880,
    allowed_mime_types = ARRAY['application/pdf'];


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Storage RLS policies
-- Files are stored at path: {user_id}/{timestamp}-{filename}.pdf
-- foldername(name)[1] extracts the first path segment (= user_id).
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old policies first (avoids duplicate-policy errors on re-run)
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'objects' AND schemaname = 'storage'
          AND policyname IN (
              'storage:resumes:insert_own',
              'storage:resumes:select_own',
              'storage:resumes:delete_own',
              'Users can upload own resumes',
              'Users can download own resumes',
              'Users can delete own resumes'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- INSERT: allows uploading to own folder
CREATE POLICY "storage:resumes:insert_own" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'resumes'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- SELECT: allows downloading own files (needed for report generation)
CREATE POLICY "storage:resumes:select_own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resumes'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- DELETE: allows deleting own files (needed for rollback on upload failure)
CREATE POLICY "storage:resumes:delete_own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'resumes'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- Done! Verify everything with:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- SELECT policyname, tablename FROM pg_policies WHERE schemaname IN ('public','storage');
-- SELECT id, name, public FROM storage.buckets WHERE id = 'resumes';
-- ─────────────────────────────────────────────────────────────────────────────
