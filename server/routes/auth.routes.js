import express from "express";
import { signup, login, forgotPassword, changePassword } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { verifyUser } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";
import {
    signupSchema,
    loginSchema,
    forgotPasswordSchema,
    changePasswordSchema,
} from "../schemas/auth.schema.js";

const router = express.Router();

// Auth routes get a tighter brute-force rate limiter on top of the global one
router.use(authLimiter);

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/change-password", verifyUser, validate(changePasswordSchema), changePassword);

export default router;