import express from "express";
import {
    generateReport,
    getReports,
    getReport,
    downloadReportPDF,
    deleteReport,
    deleteAllReports,
    rewriteReport,
    downloadOptimizedResume,
    getJobRecommendationsController,
    downloadOptimizedPDF,
    deleteAccount,
    tailorResumeForJob,
} from "../controllers/report.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { aiLimiter } from "../middleware/rateLimit.middleware.js";
import { generateReportSchema } from "../schemas/report.schema.js";

const router = express.Router();

router.post("/generate", verifyUser, aiLimiter, validate(generateReportSchema), generateReport);

router.get("/history", verifyUser, getReports);
router.delete("/all", verifyUser, deleteAllReports);
router.post("/delete-account", verifyUser, deleteAccount);

// These specific-named routes MUST come before /:id to avoid param capture
router.get("/download/:id", verifyUser, downloadOptimizedResume);
router.get("/jobs/:id", verifyUser, getJobRecommendationsController);
router.get("/:id/pdf", verifyUser, downloadReportPDF);
router.get("/:id/optimized-pdf", verifyUser, downloadOptimizedPDF);

router.post("/rewrite/:id", verifyUser, aiLimiter, rewriteReport);
router.post("/tailor/:id", verifyUser, tailorResumeForJob);

router.get("/:id", verifyUser, getReport);
router.delete("/:id", verifyUser, deleteReport);

export default router;