import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { validate, ResumeRewriteSchema } from "../middleware/validate.middleware.js";
import * as aiController from "../controllers/ai.controller.js";

const router = express.Router();

/**
 * @desc    Directly rewrite a resume based on textual input, without database assumptions
 * @route   POST /api/ai/rewrite
 * @access  Private
 */
router.post(
  "/rewrite",
  protect,
  validate(ResumeRewriteSchema),
  aiController.rewriteResume
);

export default router;
