import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import resumeRoutes from "./routes/resume.routes.js";
import reportRoutes from "./routes/report.routes.js";

import { generalLimiter } from "./middleware/rateLimit.middleware.js";
import { globalErrorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { validateEnv } from "./utils/validateEnv.js";

dotenv.config();
validateEnv(); // fail-fast if any required env var is missing

// ── App ────────────────────────────────────────────────────────────────────
const app = express();

// ── Security headers ───────────────────────────────────────────────────────
app.use(helmet());

// ── Secure CORS ────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, Render health checks)
      if (!origin) return callback(null, true);
      // If wildcard is set, allow everything
      if (ALLOWED_ORIGINS.includes("*")) return callback(null, true);
      // Otherwise check the whitelist
      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[SECURITY] CORS blocked request from unauthorized origin: ${origin}`);
        callback(new Error("CORS: Unauthorized origin"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    optionsSuccessStatus: 200,
  })
);

// ── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// ── Global rate limiter ────────────────────────────────────────────────────
app.use(generalLimiter);

// ── Health check (no auth, no rate-limit deduction) ──────────────────────
app.get("/health", (_req, res) =>
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } })
);

// ── API routes ────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/report", reportRoutes);

// ── 404 + Global error handler (must be last) ─────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`[server] ResumeIQ API listening on port ${PORT}`)
);