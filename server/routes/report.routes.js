import express from "express";
import {
    generateReport,
    getReports,
    getReport,
    deleteReport,
    downloadReportPDF,
} from "../controllers/report.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { aiLimiter } from "../middleware/rateLimit.middleware.js";
import { generateReportSchema } from "../schemas/report.schema.js";

const router = express.Router();

// All report routes require a valid JWT
router.post(
    "/generate",
    verifyUser,
    aiLimiter,                          // expensive AI call — tighter limit
    validate(generateReportSchema),     // Zod validation before controller
    generateReport
);

router.get("/history", verifyUser, getReports);
router.get("/all", verifyUser, getReports);      // backward-compat alias
router.get("/:id/pdf", verifyUser, downloadReportPDF); // must be before /:id
router.get("/:id", verifyUser, getReport);
router.delete("/:id", verifyUser, deleteReport);

export default router;