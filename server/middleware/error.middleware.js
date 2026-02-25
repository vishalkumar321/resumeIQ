import ApiError from "../utils/ApiError.js";
import { ZodError } from "zod";

/**
 * Global Express error-handling middleware.
 * Returns the standardized { success, data, error } shape.
 * Logs errors cleanly without leaking sensitive details or stack traces in production.
 */
export const globalErrorHandler = (err, req, res, next) => {
    if (res.headersSent) return;

    let { statusCode, message } = err;

    // Default to 500 if status code is not defined or is a true internal error
    if (!statusCode || statusCode >= 500) {
        statusCode = 500;
        message = "An unexpected error occurred. Please try again.";
    }

    // Specialized handling for Zod validation errors
    if (err instanceof ZodError) {
        statusCode = 422;
        message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    }

    // Log the error (can be extended to use a real logger like Winston/Pino)
    if (process.env.NODE_ENV !== 'production' || statusCode === 500) {
        console.error(`[ERROR] ${req.method} ${req.path}`, {
            statusCode,
            message: err.message,
            stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
        });
    }

    res.status(statusCode).json({
        success: false,
        data: null,
        error: message
    });
};

/**
 * 404 handler.
 */
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        data: null,
        error: `Cannot ${req.method} ${req.path}`
    });
};
