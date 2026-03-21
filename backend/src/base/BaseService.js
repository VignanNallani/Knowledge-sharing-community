import { logger } from '../config/index.js';
import { ApiError, ErrorFactory } from '../errors/index.js';

class BaseService {
  constructor(repository) {
    this.repository = repository;
    this.logger = logger;
  }

  // Generic CRUD operations
  async findById(id) {
    try {
      const result = await this.repository.findById(id);
      if (!result) {
        throw ErrorFactory.notFound();
      }
      return result;
    } catch (error) {
      this.logger.error(`Find by ID failed:`, error);
      throw error;
    }
  }

  async findAll(options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', filters = {} } = options;
      
      const skip = (page - 1) * limit;
      const orderBy = { [sortBy]: sortOrder };
      
      const [data, total] = await Promise.all([
        this.repository.findMany({ skip, take: limit, orderBy, where: filters }),
        this.repository.count({ where: filters })
      ]);

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
    } catch (error) {
      this.logger.error(`Find all failed:`, error);
      throw ErrorFactory.databaseOperationFailed('findAll', error);
    }
  }

  async create(data) {
    try {
      const result = await this.repository.create(data);
      this.logger.info(`Resource created successfully:`, { id: result.id });
      return result;
    } catch (error) {
      this.logger.error(`Create failed:`, error);
      
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        throw ErrorFactory.conflict('Resource already exists');
      }
      
      throw ErrorFactory.databaseOperationFailed('create', error);
    }
  }

  async update(id, data) {
    try {
      // First check if resource exists
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw ErrorFactory.notFound();
      }

      const result = await this.repository.update(id, data);
      this.logger.info(`Resource updated successfully:`, { id });
      return result;
    } catch (error) {
      this.logger.error(`Update failed:`, error);
      
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        throw ErrorFactory.conflict('Resource with these values already exists');
      }
      
      throw ErrorFactory.databaseOperationFailed('update', error);
    }
  }

  async delete(id) {
    try {
      // First check if resource exists
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw ErrorFactory.notFound();
      }

      await this.repository.delete(id);
      this.logger.info(`Resource deleted successfully:`, { id });
      return true;
    } catch (error) {
      this.logger.error(`Delete failed:`, error);
      throw ErrorFactory.databaseOperationFailed('delete', error);
    }
  }

  async count(filters = {}) {
    try {
      return await this.repository.count(filters);
    } catch (error) {
      this.logger.error(`Count failed:`, error);
      throw ErrorFactory.databaseOperationFailed('count', error);
    }
  }

  async exists(id) {
    try {
      const result = await this.repository.findById(id);
      return !!result;
    } catch (error) {
      this.logger.error(`Exists check failed:`, error);
      throw ErrorFactory.databaseOperationFailed('exists', error);
    }
  }

  // Transaction support
  async transaction(callback) {
    try {
      return await this.repository.transaction(callback);
    } catch (error) {
      this.logger.error(`Transaction failed:`, error);
      throw ErrorFactory.databaseOperationFailed('transaction', error);
    }
  }

  // Batch operations
  async createMany(dataArray) {
    try {
      const results = await this.repository.createMany(dataArray);
      this.logger.info(`Batch create completed:`, { count: results.length });
      return results;
    } catch (error) {
      this.logger.error(`Batch create failed:`, error);
      throw ErrorFactory.databaseOperationFailed('createMany', error);
    }
  }

  async updateMany(filters, data) {
    try {
      const result = await this.repository.updateMany(filters, data);
      this.logger.info(`Batch update completed:`, { count: result.count });
      return result;
    } catch (error) {
      this.logger.error(`Batch update failed:`, error);
      throw ErrorFactory.databaseOperationFailed('updateMany', error);
    }
  }

  async deleteMany(filters) {
    try {
      const result = await this.repository.deleteMany(filters);
      this.logger.info(`Batch delete completed:`, { count: result.count });
      return result;
    } catch (error) {
      this.logger.error(`Batch delete failed:`, error);
      throw ErrorFactory.databaseOperationFailed('deleteMany', error);
    }
  }

  // Search functionality
  async search(query, options = {}) {
    try {
      const { page = 1, limit = 20, fields = [] } = options;
      const skip = (page - 1) * limit;

      const searchFilters = this.buildSearchFilters(query, fields);
      
      const [data, total] = await Promise.all([
        this.repository.findMany({ 
          skip, 
          take: limit, 
          where: searchFilters,
          orderBy: { createdAt: 'desc' }
        }),
        this.repository.count({ where: searchFilters })
      ]);

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
    } catch (error) {
      this.logger.error(`Search failed:`, error);
      throw ErrorFactory.databaseOperationFailed('search', error);
    }
  }

  // Helper method to build search filters (to be overridden by specific services)
  buildSearchFilters(query, fields) {
    // Default implementation - can be overridden by child classes
    return {
      OR: fields.map(field => ({
        [field]: { contains: query, mode: 'insensitive' }
      }))
    };
  }

  // Validation helpers
  validateRequired(data, requiredFields) {
    const missing = requiredFields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  sanitizeData(data, allowedFields) {
    const sanitized = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        sanitized[field] = data[field];
      }
    });
    return sanitized;
  }
}

export default BaseService;
