import { ApiError } from './ApiError.js';

/**
 * Standardized pagination utility for consistent API responses
 */
export class PaginationUtility {
  /**
   * Validates and normalizes pagination parameters
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20, max: 100)
   * @param {string} options.sortBy - Field to sort by (default: 'createdAt')
   * @param {string} options.sortOrder - Sort order 'asc' or 'desc' (default: 'desc')
   * @param {string} options.cursor - Cursor for cursor-based pagination
   * @param {number} options.maxLimit - Maximum allowed limit (default: 100)
   * @returns {Object} Normalized pagination parameters
   */
  static validateAndNormalize(options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      cursor = null,
      maxLimit = 100
    } = options;

    // Validate page
    const normalizedPage = Math.max(1, parseInt(page, 10));
    if (isNaN(normalizedPage)) {
      throw ApiError.badRequest('Invalid page parameter');
    }

    // Validate limit
    const normalizedLimit = Math.min(maxLimit, Math.max(1, parseInt(limit, 10)));
    if (isNaN(normalizedLimit)) {
      throw ApiError.badRequest('Invalid limit parameter');
    }

    // Validate sort order
    const normalizedSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) 
      ? sortOrder.toLowerCase() 
      : 'desc';

    // Validate cursor (if provided)
    let normalizedCursor = cursor;
    if (cursor && typeof cursor !== 'string') {
      throw ApiError.badRequest('Invalid cursor parameter');
    }

    return {
      page: normalizedPage,
      limit: normalizedLimit,
      sortBy,
      sortOrder: normalizedSortOrder,
      cursor: normalizedCursor,
      offset: cursor ? 0 : (normalizedPage - 1) * normalizedLimit
    };
  }

  /**
   * Creates standardized pagination metadata
   * @param {Object} params - Pagination parameters
   * @param {number} params.total - Total number of items
   * @param {number} params.page - Current page
   * @param {number} params.limit - Items per page
   * @param {string} params.cursor - Current cursor (if applicable)
   * @param {string} params.nextCursor - Next cursor (if applicable)
   * @returns {Object} Pagination metadata
   */
  static createMetadata({ total, page, limit, cursor = null, nextCursor = null }) {
    const totalPages = Math.ceil(total / limit);
    
    const metadata = {
      total,
      page,
      limit,
      totalPages,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };

    // Add cursor-based pagination fields if applicable
    if (cursor !== null) {
      metadata.cursor = cursor;
      metadata.nextCursor = nextCursor;
      metadata.hasPrevious = false; // Would need previous cursor for this
    }

    return metadata;
  }

  /**
   * Creates Prisma query object with pagination
   * @param {Object} pagination - Normalized pagination parameters
   * @param {Object} additionalOptions - Additional Prisma query options
   * @returns {Object} Prisma query object
   */
  static createPrismaQuery(pagination, additionalOptions = {}) {
    const { offset, limit, sortBy, sortOrder, cursor } = pagination;
    
    const query = {
      ...additionalOptions,
      orderBy: { [sortBy]: sortOrder },
      take: limit
    };

    // Use offset-based pagination
    if (offset > 0) {
      query.skip = offset;
    }

    // Use cursor-based pagination if cursor is provided
    if (cursor) {
      query.skip = undefined;
      query.cursor = { id: cursor };
    }

    return query;
  }

  /**
   * Calculates optimal page size based on data type and use case
   * @param {string} dataType - Type of data ('posts', 'comments', 'users', etc.)
   * @param {Object} context - Additional context (user role, device type, etc.)
   * @returns {number} Recommended page size
   */
  static getOptimalPageSize(dataType, context = {}) {
    const { isMobile = false, isAdmin = false } = context;
    
    const baseSizes = {
      posts: isMobile ? 10 : 20,
      comments: isMobile ? 15 : 25,
      users: isMobile ? 20 : 30,
      notifications: isMobile ? 10 : 20,
      activities: isMobile ? 15 : 25,
      messages: isMobile ? 20 : 50
    };

    const baseSize = baseSizes[dataType] || 20;
    
    // Admin users get larger page sizes
    if (isAdmin) {
      return Math.min(baseSize * 2, 100);
    }

    return baseSize;
  }

  /**
   * Estimates query complexity for performance monitoring
   * @param {Object} pagination - Pagination parameters
   * @param {Object} query - Prisma query object
   * @returns {Object} Complexity analysis
   */
  static analyzeComplexity(pagination, query) {
    const { limit, offset } = pagination;
    const hasIncludes = !!query.include;
    const hasJoins = !!query.where || hasIncludes;
    
    let complexity = 'low';
    let estimatedRows = limit;
    
    // Adjust for offset
    if (offset > 1000) {
      complexity = 'high';
      estimatedRows = offset + limit;
    } else if (offset > 100 || hasJoins) {
      complexity = 'medium';
      estimatedRows = Math.max(offset + limit, limit * 2);
    }

    return {
      complexity,
      estimatedRows,
      recommendations: this.getRecommendations(complexity, pagination, query)
    };
  }

  /**
   * Get performance recommendations based on query complexity
   * @param {string} complexity - Query complexity level
   * @param {Object} pagination - Pagination parameters
   * @param {Object} query - Prisma query object
   * @returns {Array} List of recommendations
   */
  static getRecommendations(complexity, pagination, query) {
    const recommendations = [];
    
    if (pagination.offset > 1000) {
      recommendations.push('Consider using cursor-based pagination for deep pagination');
    }
    
    if (query.include && Object.keys(query.include).length > 3) {
      recommendations.push('Consider reducing the number of included relations');
    }
    
    if (pagination.limit > 50) {
      recommendations.push('Consider reducing page size for better performance');
    }
    
    if (complexity === 'high') {
      recommendations.push('Consider adding database indexes for frequently queried fields');
      recommendations.push('Consider implementing result caching');
    }

    return recommendations;
  }
}

// Legacy exports for backward compatibility
export const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const sort = query.sort || 'createdAt';
  return { page, limit, skip, sort };
};

export const buildPaginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

/**
 * Higher-order function that adds pagination to any service method
 * @param {Function} serviceMethod - Original service method
 * @param {Object} options - Pagination options
 * @returns {Function} Enhanced service method with pagination
 */
export function withPagination(serviceMethod, options = {}) {
  return async function(...args) {
    const lastArg = args[args.length - 1];
    const paginationOptions = typeof lastArg === 'object' && lastArg !== null 
      ? lastArg 
      : {};

    // Validate pagination parameters
    const pagination = PaginationUtility.validateAndNormalize({
      ...options,
      ...paginationOptions
    });

    // Call original method with pagination
    const result = await serviceMethod.call(this, ...args, pagination);

    // Ensure result has proper pagination metadata
    if (result.data && !result.pagination) {
      const total = result.total || result.data.length;
      result.pagination = PaginationUtility.createMetadata({
        total,
        ...pagination
      });
    }

    return result;
  };
}

export default PaginationUtility;

