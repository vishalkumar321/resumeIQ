import * as AIService from "../services/ai.service.js";
import { ok } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";

/**
 * Modular AI Controller
 * Handles direct, decoupled text-to-AI requests (no database dependencies).
 */

export const rewriteResume = async (req, res, next) => {
  try {
    const { resumeText, targetRole } = req.body;

    if (!resumeText || !targetRole) {
      throw new ApiError(400, "resumeText and targetRole are required.");
    }

    const rewritten = await AIService.rewriteResume(resumeText, targetRole);

    return ok(res, {
      success: true,
      data: rewritten
    });
  } catch (error) {
    console.error("[AI_CONTROLLER] Error during rewrite:", error.message);
    next(error);
  }
};
