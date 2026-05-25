import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { validate, JobMatchSchema } from "../middleware/validate.middleware.js";
import * as jobController from "../controllers/job.controller.js";

const router = express.Router();

// Apply authentication middleware to all job routes
router.use(protect);

/**
 * @desc    Match a resume against a job description
 * @route   POST /api/job/match
 * @access  Private
 */
router.post(
  "/match",
  validate(JobMatchSchema),
  jobController.matchJob
);

/**
 * @desc    Get user's job matches history
 * @route   GET /api/job/matches
 * @access  Private
 */
router.get("/matches", jobController.getMatches);

/**
 * @desc    Get details of a specific job
 * @route   GET /api/job/:jobId
 * @access  Private
 */
router.get("/:jobId", jobController.getJobDetails);

export default router;
