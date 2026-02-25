/**
 * Custom error class for operational errors.
 * Allows passing an HTTP status code and a descriptive message.
 */
class ApiError extends Error {
    constructor(statusCode, message, isOperational = true, stack = "") {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ApiError;
