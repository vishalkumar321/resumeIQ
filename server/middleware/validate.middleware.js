import { z } from "zod";

/**
 * Validation Middleware
 * Use Zod schemas to validate request bodies/params.
 */

export const validate = (schema) => (req, res, next) => {
  try {
    req.validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    }).body;
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }
};

// ── Common Schemas ─────────────────────────────────────────────────────────

export const JobMatchSchema = z.object({
  body: z.object({
    resumeId: z.string().uuid("Invalid resume ID"),
    jobDescription: z.string().min(50, "Job description must be at least 50 characters"),
    jobTitle: z.string().optional(),
    jobSource: z.string().optional(),
  }),
});

export const ResumeRewriteSchema = z.object({
  body: z.object({
    resumeText: z.string().min(100, "Resume text is too short"),
    targetRole: z.string().min(2, "Target role is required"),
  }),
});

export const AnalyzeResumeSchema = z.object({
  body: z.object({
    resumeText: z.string().min(100, "Resume text is too short"),
    role: z.string().min(2, "Role is required"),
  }),
});
