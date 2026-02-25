import ApiError from "../utils/ApiError.js";
import { ZodError } from "zod";

/**
 * Global Express error-handling middleware.
 * Returns the standardized { success, data, error } shape.
 * Logs errors cleanly without leaking sensitive details or stack traces in production.
 */
export const globalErrorHandler = (err, req, res, next) => {
    if (res.headersSent) return;

    // ApiError = intentional error thrown by our code — preserve the message
    // All other errors = unexpected crash — use generic message
    const isApiError = err instanceof ApiError;

    let statusCode = err.statusCode || 500;
    let message = err.message || "An unexpected error occurred. Please try again.";

    // For truly unexpected errors (not our ApiError), use a generic message
    if (!isApiError && (!statusCode || statusCode >= 500)) {
        statusCode = 500;
        message = "An unexpected error occurred. Please try again.";
    }

    // Zod validation errors
    if (err instanceof ZodError) {
        statusCode = 422;
        message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    }

    // Always log 5xx errors with full detail
    if (statusCode >= 500) {
        console.error(`[ERROR] ${req.method} ${req.path}`, {
            statusCode,
            message: err.message,
            cause: err.cause,
            stack: err.stack,
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
