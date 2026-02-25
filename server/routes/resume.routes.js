import express from "express";
import { uploadResume, upload } from "../controllers/resume.controller.js";
import { verifyUser } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/upload", verifyUser, upload.single("resume"), uploadResume);

export default router;