-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add missing job_applications table and report_name column
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create job_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    job_url TEXT,
    status TEXT DEFAULT 'applied' CHECK (status IN ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn')),
    date_applied DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for job_applications
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_applications
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'job_applications:insert_own') THEN
        CREATE POLICY "job_applications:insert_own" ON public.job_applications
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'job_applications:select_own') THEN
        CREATE POLICY "job_applications:select_own" ON public.job_applications
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'job_applications:update_own') THEN
        CREATE POLICY "job_applications:update_own" ON public.job_applications
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'job_applications:delete_own') THEN
        CREATE POLICY "job_applications:delete_own" ON public.job_applications
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 2. Ensure report_name and cover_letter columns exist in reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS report_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS cover_letter JSONB;
