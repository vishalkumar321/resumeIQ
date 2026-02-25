/**
 * Standardized API response helpers.
 * All responses follow the shape:
 *   { success: boolean, data: any | null, error: string | null }
 */

export const ok = (res, data = null, status = 200) =>
    res.status(status).json({
        success: true,
        data,
        error: null
    });

export const created = (res, data = null) =>
    res.status(201).json({
        success: true,
        data,
        error: null
    });

/**
 * Used for known failures where we want to send a specific status code and message.
 */
export const fail = (res, message, status = 400) =>
    res.status(status).json({
        success: false,
        data: null,
        error: message
    });

/**
 * Fallback for unexpected internal errors.
 */
export const serverError = (
    res,
    message = "An unexpected error occurred. Please try again."
) => res.status(500).json({
    success: false,
    data: null,
    error: message
});
