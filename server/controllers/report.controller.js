import { analyzeResume, analyzeResumeByJD } from "../services/ai.service.js";
import { extractTextFromPDF } from "../services/pdf.service.js";
import { ok, created, fail } from "../utils/response.js";
import asyncWrapper from "../middleware/async.middleware.js";
import ApiError from "../utils/ApiError.js";

// ── POST /api/report/generate ──────────────────────────────────────────────
export const generateReport = asyncWrapper(async (req, res) => {
  const { resume_id, mode, role, job_description } = req.validated;
  const user = req.user;
  const supabase = req.supabase;

  // ── Step 0: Daily Limit Check ────────────────────────────────────────
  console.log("[report] step0: checking daily limit for user", user.id);
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const { count, error: countError } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfToday.toISOString());

  if (countError) {
    console.error("[report] step0 FAILED:", countError);
    throw new ApiError(500, "Failed to verify daily report limit.");
  }

  if (count >= 10) {
    return fail(res, "Daily limit reached (10 reports/day).", 403);
  }

  // ── Step 1: Fetch resume (RLS-enforced) ───────────────────────────────
  console.log("[report] step1: fetching resume", resume_id);
  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .select("id, file_path, user_id")
    .eq("id", resume_id)
    .single();

  if (resumeError || !resume) {
    console.error("[report] step1 FAILED:", resumeError);
    return fail(res, "Resume not found or access denied.", 404);
  }

  // ── Step 2: Download PDF from Storage ────────────────────────────────
  console.log("[report] step2: downloading", resume.file_path);
  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("resumes")
    .download(resume.file_path);

  if (downloadError || !fileBlob) {
    console.error("[report] step2 FAILED:", downloadError);
    throw new ApiError(500, "Failed to retrieve resume file from storage.");
  }

  const buffer = Buffer.from(await fileBlob.arrayBuffer());

  // ── Step 3: Extract text ──────────────────────────────────────────────
  console.log("[report] step3: extracting PDF text");
  const resumeText = await extractTextFromPDF(buffer);
  console.log("[report] step3: extracted", resumeText.length, "chars");

  // ── Step 4: AI analysis ───────────────────────────────────────────────
  console.log("[report] step4: calling AI, mode=", mode);
  let analysis;
  try {
    analysis =
      mode === "jd"
        ? await analyzeResumeByJD(resumeText, job_description)
        : await analyzeResume(resumeText, role);
  } catch (aiErr) {
    throw new ApiError(502, "AI service is temporarily unavailable. Please try again.");
  }

  // ── Step 5: Validate AI response shape ───────────────────────────────
  const { score, strengths, weaknesses, suggestions } = analysis;

  if (
    typeof score !== "number" ||
    !Array.isArray(strengths) ||
    !Array.isArray(weaknesses) ||
    !Array.isArray(suggestions)
  ) {
    throw new ApiError(502, "Received an unexpected response from the AI service.");
  }

  // ── Step 6: Persist ───────────────────────────────────────────────────
  const { data: report, error: dbError } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      resume_id: resume.id,
      analysis_type: mode,
      role: role ?? null,
      score: Math.round(Math.min(100, Math.max(0, score))),
      strengths: strengths.slice(0, 5),
      weaknesses: weaknesses.slice(0, 5),
      suggestions: suggestions.slice(0, 5),
      job_description: job_description ?? null,
      match_score: mode === "jd" ? Math.round(Math.min(100, Math.max(0, analysis.match_score))) : null,
      missing_keywords: mode === "jd" ? analysis.missing_keywords.slice(0, 10) : null,
    })
    .select()
    .single();

  if (dbError) {
    throw new ApiError(500, "Report generated but could not be saved.");
  }

  return created(res, { report });
});

// ── GET /api/report/history ────────────────────────────────────────────────
export const getReports = asyncWrapper(async (req, res) => {
  const { data: reports, error } = await req.supabase
    .from("reports")
    .select("id, resume_id, role, analysis_type, score, match_score, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(500, "Failed to fetch reports from the database.");
  }

  return ok(res, { reports });
});

// ── GET /api/report/:id ────────────────────────────────────────────────────
export const getReport = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const { data: report, error } = await req.supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !report) {
    return fail(res, "Report not found or access denied.", 404);
  }

  return ok(res, { report });
});

// ── GET /api/report/:id/pdf ────────────────────────────────────────────────
export const downloadReportPDF = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const { data: report, error } = await req.supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !report) {
    return fail(res, "Report not found or access denied.", 404);
  }

  const slug = (report.role ?? "jd-match")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="resumeiq-${slug}-report.pdf"`);
  res.setHeader("Cache-Control", "no-store");

  const { generateReportPDF } = await import("../services/report.pdf.service.js");
  generateReportPDF(report, res);
});

// ── DELETE /api/report/:id ─────────────────────────────────────────────────
export const deleteReport = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const supabase = req.supabase;

  // Fetch first to ensure existence/ownership (RLS)
  const { data: report, error: fetchErr } = await supabase
    .from("reports")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchErr || !report) {
    return fail(res, "Report not found or access denied.", 404);
  }

  const { error: deleteErr } = await supabase
    .from("reports")
    .delete()
    .eq("id", id);

  if (deleteErr) {
    throw new ApiError(500, "Failed to delete report.");
  }

  return res.status(204).send();
});