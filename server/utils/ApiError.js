/**
 * Custom error class for operational errors.
 * Allows passing an HTTP status code and a descriptive message.
 */
class ApiError extends Error {
    constructor(statusCode, message, options = {}) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = options.isOperational ?? true;
        this.cause = options.cause;

        if (options.stack) {
            this.stack = options.stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ApiError;
