import { analyzeResume, analyzeResumeByJD, rewriteResume, rewriteResumeForJob } from "../services/ai.service.js";
import { generateOptimizedPDF as genPDF } from "../services/pdf.generator.service.js";
import { getJobLinks } from "../services/jobs.service.js";
import { scrapeJobDescription } from "../services/scraper.service.js";
import { extractTextFromPDF } from "../services/pdf.service.js";
import { ok, created, fail } from "../utils/response.js";
import asyncWrapper from "../middleware/async.middleware.js";
import ApiError from "../utils/ApiError.js";
import fs from "fs";

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
  console.log("[STEP 1] File received:", !!fileBlob);
  const resumeText = await extractTextFromPDF(buffer);
  console.log("[STEP 2] Text extracted, length:", resumeText?.length);
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
    isNaN(score) ||
    !Array.isArray(strengths) ||
    !Array.isArray(weaknesses) ||
    !Array.isArray(suggestions)
  ) {
    throw new ApiError(502, "Received an unexpected response from the AI service.");
  }

  // ── Step 6: Persist ───────────────────────────────────────────────────
  const reportData = {
    user_id: user.id,
    resume_id: resume.id,
    analysis_type: mode,
    role: role ?? null,
    report_name: role || 'Resume Analysis',
    score: Math.round(Math.min(100, Math.max(0, score))),
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    suggestions: suggestions.slice(0, 5),
    job_description: job_description ?? null,
    match_score: mode === "jd" ? Math.round(Math.min(100, Math.max(0, analysis.match_score))) : null,
    // Store missing keywords for both 'role' (ATS analyzeResume) and 'jd' modes
    missing_keywords: Array.isArray(analysis.missing_keywords) ? analysis.missing_keywords.slice(0, 10) : null,
    resume_text: resumeText,
  };

  // We explicitly preserve formatting_issues for the API response
  // even if it's not present in the Supabase Schema yet.
  const formattingIssuesTemp = Array.isArray(analysis.formatting_issues) ? analysis.formatting_issues.slice(0, 5) : [];

  console.log("[STEP 3] Saving to Supabase with resume_text:", !!reportData.resume_text);
  let { data: report, error: dbError } = await supabase
    .from("reports")
    .insert(reportData)
    .select()
    .single();

  console.log("[STEP 4] Supabase insert result:", dbError ? dbError.message : 'success');

  // Safety Fallback: If optional columns (resume_text, report_name) don't exist yet
  // in the DB schema, strip them and retry so report generation never hard-fails.
  if (dbError && (dbError.code === '42703' || dbError.code === 'PGRST204')) {
    console.warn("[Upload] Unknown column in DB. Stripping optional fields and retrying. Run SQL migration for full functionality.");
    delete reportData.resume_text;
    delete reportData.report_name;
    delete reportData.missing_keywords;
    delete reportData.match_score;
    const fallback = await supabase
      .from("reports")
      .insert(reportData)
      .select()
      .single();
    report = fallback.data;
    dbError = fallback.error;
  }

  if (dbError) {
    console.error("[Upload] Database error:", dbError);
    try {
      fs.appendFileSync("backend_errors.log", JSON.stringify({ timestamp: new Date(), error: dbError }) + "\n");
    } catch (e) { }
    throw new ApiError(500, "Report generated but could not be saved.");
  }

  console.log('[Upload] report saved, id:', report.id);

  // Generate a short-lived signed URL for the PDF so the frontend can render
  // the actual uploaded PDF in an iframe (valid for 1 hour).
  let resumeUrl = null;
  try {
    const { data: signedData } = await supabase.storage
      .from('resumes')
      .createSignedUrl(resume.file_path, 3600);
    resumeUrl = signedData?.signedUrl || null;
  } catch (e) {
    console.warn('[Upload] Could not generate signed URL:', e.message);
  }

  // Always include resume_text and resume_url in the response so the frontend
  // (ReportOverlay) can display the original PDF, even when DB columns are missing.
  return created(res, { 
    report: { 
      ...report, 
      resume_text: resumeText || null, 
      resume_url: resumeUrl,
      formatting_issues: formattingIssuesTemp 
    } 
  });
});

// ── GET /api/report/history ────────────────────────────────────────────────
export const getReports = asyncWrapper(async (req, res) => {
  let { data: reports, error } = await req.supabase
    .from("reports")
    .select("id, resume_id, role, report_name, analysis_type, score, match_score, created_at, optimized_resume")
    .order("created_at", { ascending: false });

  // Graceful fallback: if report_name column doesn't exist yet (before SQL migration),
  // retry without it so the app keeps working.
  if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('report_name'))) {
    console.warn("[getReports] report_name column missing, retrying without it. Run: ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_name TEXT;");
    const fallback = await req.supabase
      .from("reports")
      .select("id, resume_id, role, analysis_type, score, match_score, created_at, optimized_resume")
      .order("created_at", { ascending: false });
    reports = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new ApiError(500, "Failed to fetch reports from the database.");
  }

  return ok(res, { reports });
});

// ── GET /api/report/:id ────────────────────────────────────────────────────
export const getReport = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const supabase = req.supabase;

  const { data: report, error } = await supabase
    .from("reports")
    .select("*, resumes(file_path)")
    .eq("id", id)
    .single();

  if (error || !report) {
    return fail(res, "Report not found or access denied.", 404);
  }

  // Generate a signed URL for the PDF so frontend can render it in an iframe.
  const filePath = Array.isArray(report.resumes) ? report.resumes[0]?.file_path : report.resumes?.file_path;
  let resumeUrl = null;
  try {
    if (filePath) {
      const { data: signedData } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 3600);
      resumeUrl = signedData?.signedUrl || null;
    }
  } catch (e) {
    console.warn('[getReport] Could not generate signed URL:', e.message);
  }

  // Use the stored resume_text (saved at analysis time).
  // If not present (old report), fall back to re-extracting from PDF.
  if (report.resume_text) {
    console.log('[getReport] Using stored resume_text, length:', report.resume_text.length);
    return ok(res, { report: { ...report, resume_url: resumeUrl } });
  }

  // Legacy fallback: re-extract from PDF for older reports that predate text saving
  let rawText = "";
  try {
    if (filePath) {
      const { data: fileBlob } = await supabase.storage
        .from("resumes")
        .download(filePath);
      if (fileBlob) {
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        rawText = await extractTextFromPDF(buffer);
        console.log('[getReport] Fallback PDF extraction, length:', rawText.length);
      }
    }
  } catch (err) {
    console.warn("[getReport] Fallback PDF extraction failed:", err.message);
  }

  return ok(res, {
    report: {
      ...report,
      resume_text: rawText || null,
      resume_url: resumeUrl
    }
  });
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

// ── DELETE /api/report/all ────────────────────────────────────────────────
export const deleteAllReports = asyncWrapper(async (req, res) => {
  const user = req.user;
  const supabase = req.supabase;

  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    throw new ApiError(500, "Failed to delete all reports.");
  }

  return res.status(204).send();
});

// ── POST /api/report/rewrite/:id ───────────────────────────────────────────
export const rewriteReport = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { targetRole = "Software Engineer" } = req.body;
  const supabase = req.supabase;

  console.log(`[REWRITE] Starting optimization for report ${id} with role ${targetRole}`);

  try {
    // ── Step 1: Fetch report ───────────────────────────────────────────
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*, resumes(*)")
      .eq("id", id)
      .single();

    if (reportError || !report) {
      console.error("[REWRITE] Step 1 Failed:", reportError);
      return fail(res, "Report not found or access denied.", 404);
    }

    // ── Step 2: Extract file path ──────────────────────────────────────
    let filePath = null;
    if (Array.isArray(report.resumes)) {
      filePath = report.resumes[0]?.file_path;
    } else {
      filePath = report.resumes?.file_path;
    }

    if (!filePath) {
      console.error("[REWRITE] No file_path found in resume object");
      throw new ApiError(400, "Resume file not found for this report.");
    }

    console.log("[REWRITE] Step 3: Downloading PDF", filePath);
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(filePath);

    if (downloadError || !fileBlob) {
      console.error("[REWRITE] Step 3 Failed (Storage):", downloadError);
      throw new ApiError(500, "Failed to retrieve resume file from storage.");
    }

    const buffer = Buffer.from(await fileBlob.arrayBuffer());

    // ── Step 3: Extract text ──────────────────────────────────────────
    console.log("[REWRITE] Step 3: Extracting text");
    const resumeText = await extractTextFromPDF(buffer);

    // ── Step 4: AI Rewrite ─────────────────────────────────────────────
    console.log("[REWRITE] Step 4: Calling AI");
    let optimized;
    try {
      optimized = await rewriteResume(resumeText, targetRole);
      console.log("[REWRITE] AI success, data length:", JSON.stringify(optimized).length);
    } catch (aiErr) {
      console.error("[REWRITE] Step 4 Failed (AI):", aiErr);
      throw new ApiError(502, "AI optimization failed.");
    }

    // ── Step 6: Update record ───────────────────────────────────────────
    console.log("[REWRITE] Step 6: Updating database (admin)");
    const { supabaseAdmin } = await import("../services/supabase.js");

    const { data: updatedReport, error: updateError } = await supabaseAdmin
      .from("reports")
      .update({
        optimized_resume: optimized,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[REWRITE] Step 6 Failed (DB Update):", updateError);
      throw new ApiError(500, `Database update failed: ${updateError.message}`);
    }

    console.log("[REWRITE] Success!");
    return ok(res, {
      success: true,
      optimized: updatedReport.optimized_resume
    });
  } catch (error) {
    console.error("[REWRITE] UNCAUGHT ERROR:", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error.message || "Internal server error during optimization.");
  }
});

// ── GET /api/report/download/:id ───────────────────────────────────────────
export const downloadOptimizedResume = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const supabase = req.supabase;

  const { data: report, error } = await supabase
    .from("reports")
    .select("optimized_resume, user_id")
    .eq("id", id)
    .single();

  if (error || !report) {
    return fail(res, "Report not found or access denied.", 404);
  }

  // Ownership check
  if (report.user_id !== user.id) {
    return fail(res, "Forbidden", 403);
  }

  if (!report.optimized_resume) {
    return fail(res, "Run the optimizer first", 400);
  }

  try {
    const pdfBuffer = await genPDF(report.optimized_resume);

    const slug = (report.role ?? "optimized")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="resumeiq-${slug}-optimized.pdf"`,
      "Content-Length": pdfBuffer.length,
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Content-Disposition"
    });
    return res.end(pdfBuffer);
  } catch (pdfErr) {
    console.error("[report-download-optimized] FAILED:", pdfErr);
    throw new ApiError(500, "Failed to generate optimized resume PDF.");
  }
});

// ── GET /api/report/jobs/:id ───────────────────────────────────────────────
export const getJobRecommendationsController = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const supabase = req.supabase;

  const { data: report, error } = await supabase
    .from("reports")
    .select("optimized_resume, user_id")
    .eq("id", id)
    .single();

  if (error || !report) {
    return fail(res, "Report not found or access denied.", 404);
  }

  // Ownership check
  if (report.user_id !== user.id) {
    return fail(res, "Forbidden", 403);
  }

  if (!report.optimized_resume) {
    return fail(res, "Optimized data missing. Please optimize your resume first.", 400);
  }

  const { target_role, skills } = report.optimized_resume;
  const jobs = getJobLinks(target_role || "Software Engineer", skills || []);

  return ok(res, { success: true, jobs });
});

// ── GET /api/report/:id/optimized-pdf ──────────────────────────────────────
export const downloadOptimizedPDF = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const { data: report, error } = await req.supabase
    .from("reports")
    .select("optimized_resume, optimized_score, role")
    .eq("id", id)
    .single();

  if (error || !report) {
    return fail(res, "Report not found or access denied.", 404);
  }

  if (!report.optimized_resume) {
    return fail(res, "This report has not been optimized yet.", 400);
  }

  const slug = (report.role ?? "optimized")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="resumeiq-\${slug}-optimized.pdf"`);
  res.setHeader("Cache-Control", "no-store");

  try {
    const pdfBuffer = await genPDF(report.optimized_resume);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="resumeiq-${slug}-optimized.pdf"`,
      "Content-Length": pdfBuffer.length,
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Content-Disposition"
    });
    return res.end(pdfBuffer);
  } catch (pdfErr) {
    console.error("[report-pdf-optimized] FAILED:", pdfErr);
    throw new ApiError(500, "Failed to generate optimized resume PDF.");
  }
});

// ── POST /api/auth/delete-account ──────────────────────────────────────────
export const deleteAccount = asyncWrapper(async (req, res) => {
  const user = req.user;
  const supabase = req.supabase;
  const { supabaseAdmin } = await import("../services/supabase.js");

  // 1. Delete all reports
  const { error: reportsErr } = await supabase
    .from("reports")
    .delete()
    .eq("user_id", user.id);

  if (reportsErr) {
    throw new ApiError(500, "Failed to delete user reports during account deletion.");
  }

  // 2. Delete all resumes
  const { error: resumesErr } = await supabase
    .from("resumes")
    .delete()
    .eq("user_id", user.id);

  if (resumesErr) {
    throw new ApiError(500, "Failed to delete user resumes during account deletion.");
  }

  // 3. Delete auth user (Admin only)
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (authErr) {
    throw new ApiError(500, "Failed to delete auth account.");
  }

  return ok(res, { message: "Account deleted successfully." });
});

// ── POST /api/report/tailor/:id ──────────────────────────────────────────
export const tailorResumeForJob = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { jobUrl, targetRole } = req.body;
  const supabase = req.supabase;

  if (!jobUrl) return fail(res, "jobUrl is required.", 400);

  // Scrape the job description
  const scraped = await scrapeJobDescription(jobUrl);
  if (!scraped.success) {
    return fail(res, `Could not scrape job description: ${scraped.error}`, 400);
  }

  // Fetch report + resume file path
  const { data: report, error: rErr } = await supabase
    .from("reports")
    .select("*, resumes(file_path)")
    .eq("id", id)
    .single();
  if (rErr || !report) return fail(res, "Report not found.", 404);

  // Get resume text (stored or re-extract)
  let resumeText = report.resume_text;
  if (!resumeText) {
    const filePath = Array.isArray(report.resumes) ? report.resumes[0]?.file_path : report.resumes?.file_path;
    if (filePath) {
      const { data: fileBlob } = await supabase.storage.from("resumes").download(filePath);
      if (fileBlob) {
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        resumeText = await extractTextFromPDF(buffer);
      }
    }
  }
  if (!resumeText) return fail(res, "Could not retrieve resume text.", 400);

  let tailored;
  try {
    tailored = await rewriteResumeForJob(resumeText, scraped.text, targetRole);
  } catch (aiErr) {
    throw new ApiError(502, "AI tailoring failed.");
  }

  const { supabaseAdmin } = await import("../services/supabase.js");
  const { data: updated, error: uErr } = await supabaseAdmin
    .from("reports")
    .update({ tailored_resume: tailored, job_url: jobUrl, job_description: scraped.text })
    .eq("id", id)
    .select()
    .single();

  if (uErr) throw new ApiError(500, "Failed to save tailored resume.");

  return ok(res, { success: true, tailored: updated.tailored_resume });
});
