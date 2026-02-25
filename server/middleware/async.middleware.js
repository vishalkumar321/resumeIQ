/**
 * Higher-order function to wrap async route handlers.
 * Removes the need for explicit try/catch blocks in every controller.
 * Passes caught errors to the next middleware (central error handler).
 */
const asyncWrapper = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((err) => next(err));
    };
};

export default asyncWrapper;
