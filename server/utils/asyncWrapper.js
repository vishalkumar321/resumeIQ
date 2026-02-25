/**
 * Wraps an async Express route handler so you never need a try/catch block
 * inside individual controllers. Any thrown error is forwarded to the next()
 * error handler (i.e. globalErrorHandler in error.middleware.js).
 *
 * Usage:
 *   router.get("/foo", asyncWrapper(async (req, res) => {
 *     const data = await someAsyncOperation();
 *     return ok(res, data);
 *   }));
 */
export const asyncWrapper = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
