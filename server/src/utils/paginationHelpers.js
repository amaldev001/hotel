/**
 * Parses page and limit parameters from request query.
 * Default page: 1
 * Default limit: 20
 * Maximum limit: 100
 * @param {object} query - req.query object
 * @returns {{ page: number, limit: number, skip: number }}
 */
export const parsePagination = (query = {}) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Formats a paginated response envelope.
 * @param {Array} data - Query results array
 * @param {number} total - Total record count
 * @param {number} page - Current page number
 * @param {number} limit - Page size limit
 * @returns {object}
 */
export const formatPaginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit) || 0;
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};
