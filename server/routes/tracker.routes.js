import express from "express";
import { verifyUser } from "../middleware/auth.middleware.js";
import {
    getApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    getTrackerStats,
} from "../controllers/tracker.controller.js";

const router = express.Router();

router.get("/stats", verifyUser, getTrackerStats);
router.get("/", verifyUser, getApplications);
router.post("/", verifyUser, createApplication);
router.patch("/:id", verifyUser, updateApplication);
router.delete("/:id", verifyUser, deleteApplication);

export default router;
