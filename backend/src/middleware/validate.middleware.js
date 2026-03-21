import { logger } from '../config/index.js';
import { ApiError } from '../errors/index.js';

export const validate = (schema) => (req, res, next) => {
  if (!schema) return next();

  // Debug: Log what we're receiving
  console.log('🔍 Validation Debug - Request body:', req.body);
  console.log('🔍 Validation Debug - Request params:', req.params);
  console.log('🔍 Validation Debug - Request query:', req.query);

  // Create the data structure expected by Zod schema
  const data = {
    body: req.body,
    params: req.params,
    query: req.query
  };

  console.log('🔍 Validation Debug - Data structure:', data);

  const result = schema.safeParse(data);

  if (!result.success) {
    const errorMessages = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
    
    console.log('❌ Validation failed:', errorMessages);
    logger.warn('Validation failed', { errors: errorMessages });
    throw ApiError.validation('Validation failed', errorMessages);
  }

  console.log('✅ Validation passed:', result.data);

  // Merge validated data back to request object
  if (result.data.body) req.body = result.data.body;
  if (result.data.params) req.params = result.data.params;
  if (result.data.query) req.query = result.data.query;

  next();
};

export default validate;
