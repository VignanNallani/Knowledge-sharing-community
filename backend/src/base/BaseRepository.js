import { logger } from '../config/index.js';
import { ApiError, ErrorFactory } from '../errors/index.js';

class BaseRepository {
  constructor(model, modelName) {
    this.model = model;
    this.modelName = modelName;
    this.logger = logger;
  }

  // Basic CRUD operations
  async findById(id) {
    try {
      const result = await this.model.findUnique({
        where: { id }
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} findById failed:`, error);
      throw ErrorFactory.databaseOperationFailed('findById', error);
    }
  }

  async findMany(options = {}) {
    try {
      const { 
        where = {}, 
        orderBy = { createdAt: 'desc' }, 
        skip = 0, 
        take = 20,
        include = {},
        select = undefined
      } = options;

      const result = await this.model.findMany({
        where,
        orderBy,
        skip,
        take,
        include,
        select
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} findMany failed:`, error);
      throw ErrorFactory.databaseOperationFailed('findMany', error);
    }
  }

  async create(data) {
    try {
      const result = await this.model.create({
        data
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} create failed:`, error);
      throw ErrorFactory.databaseOperationFailed('create', error);
    }
  }

  async update(id, data) {
    try {
      const result = await this.model.update({
        where: { id },
        data
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} update failed:`, error);
      throw ErrorFactory.databaseOperationFailed('update', error);
    }
  }

  async delete(id) {
    try {
      await this.model.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      this.logger.error(`${this.modelName} delete failed:`, error);
      throw ErrorFactory.databaseOperationFailed('delete', error);
    }
  }

  async count(options = {}) {
    try {
      const { where = {} } = options;
      const result = await this.model.count({
        where
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} count failed:`, error);
      throw ErrorFactory.databaseOperationFailed('count', error);
    }
  }

  async exists(id) {
    try {
      const result = await this.model.findUnique({
        where: { id },
        select: { id: true }
      });
      return !!result;
    } catch (error) {
      this.logger.error(`${this.modelName} exists failed:`, error);
      throw ErrorFactory.databaseOperationFailed('exists', error);
    }
  }

  // Transaction support
  async transaction(callback) {
    try {
      return await this.model.$transaction(callback);
    } catch (error) {
      this.logger.error(`${this.modelName} transaction failed:`, error);
      throw ErrorFactory.databaseOperationFailed('transaction', error);
    }
  }

  // Batch operations
  async createMany(dataArray) {
    try {
      const result = await this.model.createMany({
        data: dataArray
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} createMany failed:`, error);
      throw ErrorFactory.databaseOperationFailed('createMany', error);
    }
  }

  async updateMany(where, data) {
    try {
      const result = await this.model.updateMany({
        where,
        data
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} updateMany failed:`, error);
      throw ErrorFactory.databaseOperationFailed('updateMany', error);
    }
  }

  async deleteMany(where) {
    try {
      const result = await this.model.deleteMany({
        where
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} deleteMany failed:`, error);
      throw ErrorFactory.databaseOperationFailed('deleteMany', error);
    }
  }

  // Advanced queries
  async findFirst(options = {}) {
    try {
      const { 
        where = {}, 
        orderBy = { createdAt: 'desc' },
        include = {},
        select = undefined
      } = options;

      const result = await this.model.findFirst({
        where,
        orderBy,
        include,
        select
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} findFirst failed:`, error);
      throw ErrorFactory.databaseOperationFailed('findFirst', error);
    }
  }

  async findUnique(options = {}) {
    try {
      const { 
        where = {}, 
        include = {},
        select = undefined
      } = options;

      const result = await this.model.findUnique({
        where,
        include,
        select
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} findUnique failed:`, error);
      throw ErrorFactory.databaseOperationFailed('findUnique', error);
    }
  }

  // Aggregation queries
  async aggregate(options = {}) {
    try {
      const { 
        where = {}, 
        _count = {},
        _avg = {},
        _sum = {},
        _min = {},
        _max = {}
      } = options;

      const result = await this.model.aggregate({
        where,
        _count,
        _avg,
        _sum,
        _min,
        _max
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} aggregate failed:`, error);
      throw ErrorFactory.databaseOperationFailed('aggregate', error);
    }
  }

  // Group by queries
  async groupBy(options = {}) {
    try {
      const { 
        by = [],
        where = {},
        _count = {},
        _avg = {},
        _sum = {}
      } = options;

      const result = await this.model.groupBy({
        by,
        where,
        _count,
        _avg,
        _sum
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} groupBy failed:`, error);
      throw ErrorFactory.databaseOperationFailed('groupBy', error);
    }
  }

  // Raw queries (for complex operations)
  async queryRaw(query, parameters = []) {
    try {
      const result = await this.model.$queryRaw`${query}`;
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} queryRaw failed:`, error);
      throw ErrorFactory.databaseOperationFailed('queryRaw', error);
    }
  }

  async executeRaw(command, parameters = []) {
    try {
      const result = await this.model.$executeRaw`${command}`;
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} executeRaw failed:`, error);
      throw ErrorFactory.databaseOperationFailed('executeRaw', error);
    }
  }

  // Utility methods
  async softDelete(id) {
    try {
      const result = await this.model.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} softDelete failed:`, error);
      throw ErrorFactory.databaseOperationFailed('softDelete', error);
    }
  }

  async restore(id) {
    try {
      const result = await this.model.update({
        where: { id },
        data: { deletedAt: null }
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.modelName} restore failed:`, error);
      throw ErrorFactory.databaseOperationFailed('restore', error);
    }
  }

  // Validation helpers
  validateId(id) {
    if (!id || typeof id !== 'number' || id <= 0) {
      throw new Error('Invalid ID provided');
    }
  }

  buildWhereClause(filters) {
    const where = {};
    
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && value.includes('*')) {
          // Handle wildcard searches
          where[key] = {
            contains: value.replace(/\*/g, ''),
            mode: 'insensitive'
          };
        } else {
          where[key] = value;
        }
      }
    });
    
    return where;
  }

  buildOrderByClause(sortBy, sortOrder = 'desc') {
    if (!sortBy) return { createdAt: 'desc' };
    
    return { [sortBy]: sortOrder };
  }
}

export default BaseRepository;
