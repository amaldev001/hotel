/**
 * Wrapper for async route controllers to automatically forward rejected promises to Express error handler.
 * @param {Function} fn - Async controller function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
