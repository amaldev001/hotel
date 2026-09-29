import { AppError } from '../utils/AppError.js';

/**
 * Validates request data against Zod schemas for body, params, and query.
 * Strips unknown fields and rejects invalid types (e.g., NoSQL injection objects).
 * 
 * @param {object} schemas - Object containing optional Zod schemas for { body, params, query }
 */
export const validate = (schemas = {}) => {
  return async (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.strip().parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.strip().parseAsync(req.query);
      }
      if (schemas.body) {
        req.body = await schemas.body.strip().parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error.name === 'ZodError' || error.issues) {
        const details = {};
        error.issues.forEach((issue) => {
          const path = issue.path.join('.') || 'body';
          details[path] = issue.message;
        });
        return next(new AppError('Validation failed', 400, 'INVALID_INPUT', details));
      }
      next(error);
    }
  };
};

export default validate;
