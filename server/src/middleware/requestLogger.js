/**
 * Request logger middleware that logs method, path, HTTP status, and duration only.
 * Strictly NEVER logs request/response bodies, cookies, authorization tokens, passwords, addresses, or phone numbers.
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const method = req.method;
  const path = req.originalUrl || req.url;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    console.log(`[HTTP] ${method} ${path} ${status} - ${duration}ms`);
  });

  next();
};

export default requestLogger;
