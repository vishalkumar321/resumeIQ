import multer from "multer";
import { extractTextFromPDF } from "../services/pdf.service.js";
import { ok, created, fail } from "../utils/response.js";
import asyncWrapper from "../middleware/async.middleware.js";
import ApiError from "../utils/ApiError.js";

// ── Multer config ──────────────────────────────────────────────────────────
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      const error = new Error("Only PDF files are accepted.");
      error.statusCode = 415;
      return cb(error);
    }
    cb(null, true);
  },
});

// ── POST /api/resume/upload ────────────────────────────────────────────────
export const uploadResume = asyncWrapper(async (req, res) => {
  const file = req.file;
  const user = req.user;
  const supabase = req.supabase;

  if (!file) {
    return fail(res, "No file uploaded. Attach a PDF under the key 'resume'.", 400);
  }

  // ── Step 1: Extract text (validates PDF content) ──────────────────────
  const resumeText = await extractTextFromPDF(file.buffer);

  // ── Step 2: Upload to Supabase Storage ────────────────────────────────
  const filePath = `${user.id}/${Date.now()}-${file.originalname}`;

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(filePath, file.buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new ApiError(500, "Failed to upload resume to storage.");
  }

  // ── Step 3: Persist metadata (RLS-enforced) ──────────────────────────
  const { data: resumeRecord, error: dbError } = await supabase
    .from("resumes")
    .insert({ user_id: user.id, file_path: filePath })
    .select()
    .single();

  if (dbError) {
    // Rollback storage file on DB failure
    await supabase.storage.from("resumes").remove([filePath]);
    throw new ApiError(500, "Failed to save resume metadata.");
  }

  return created(res, { resume: resumeRecord });
});