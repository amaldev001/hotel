/**
 * Application Error Class for consistent error reporting across the platform.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message (informational)
   * @param {number} statusCode - HTTP Status Code (e.g., 400, 401, 403, 404, 409, 429, 500)
   * @param {string} code - Canonical error code (e.g. 'INVALID_INPUT', 'UNAUTHORIZED', 'FORBIDDEN')
   * @param {object} [details] - Optional extra metadata/field errors
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
