import { supabase } from "./supabase.js";
import { matchJob } from "./ai.service.js";

/**
 * Job Service
 * Handles business logic for job matching and persistence.
 */

export const createJob = async (userId, title, description, source = 'manual') => {
  const { data, error } = await supabase
    .from("jobs")
    .insert([{ user_id: userId, title, description, source }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getJobById = async (jobId) => {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) throw error;
  return data;
};

export const getResumeText = async (resumeId) => {
  // Try to find the latest report for this resume to get the text
  const { data, error } = await supabase
    .from("reports")
    .select("resume_text")
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.resume_text) {
    throw new Error("Could not find extracted text for this resume. Please analyze it first.");
  }
  return data.resume_text;
};

export const processJobMatch = async (userId, resumeId, jobId, jobDescription) => {
  // 1. Get resume text
  const resumeText = await getResumeText(resumeId);

  // 2. Call AI Service for matching
  const matchResult = await matchJob(resumeText, jobDescription);

  // 3. Persist match result
  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .insert([{
      user_id: userId,
      resume_id: resumeId,
      job_id: jobId,
      match_score: matchResult.match_percentage,
      missing_skills: matchResult.missing_skills,
      strengths: matchResult.strengths_alignment,
      weaknesses: matchResult.weaknesses_alignment,
      suggestions: matchResult.improvement_plan
    }])
    .select()
    .single();

  if (matchError) throw matchError;

  return {
    matchId: matchData.id,
    ...matchResult
  };
};

export const getUserMatches = async (userId) => {
  const { data, error } = await supabase
    .from("matches")
    .select(`
      *,
      jobs (title, source),
      resumes (file_path)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};
