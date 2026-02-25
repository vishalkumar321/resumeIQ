import rateLimit from "express-rate-limit";

const json429 = (_req, res) =>
    res.status(429).json({
        success: false,
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please slow down and try again later.",
        },
    });

/**
 * General API limiter — applied to every route.
 * 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429,
});

/**
 * Auth limiter — applied only to /api/auth/* routes.
 * 10 requests per 10 minutes per IP (brute-force protection).
 */
export const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429,
});

/**
 * Upload/report limiter — expensive AI calls.
 * 20 requests per hour per IP.
 */
export const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429,
});
