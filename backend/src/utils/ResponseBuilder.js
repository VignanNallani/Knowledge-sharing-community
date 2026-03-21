class ResponseBuilder {
  constructor(res) {
    this.res = res;
    this.response = {
      success: true,
      timestamp: new Date().toISOString()
    };
  }

  success(message = 'Success') {
    this.response.success = true;
    this.response.message = message;
    return this;
  }

  error(message = 'Error') {
    this.response.success = false;
    this.response.message = message;
    return this;
  }

  data(data) {
    this.response.data = data;
    return this;
  }

  meta(meta) {
    this.response.meta = meta;
    return this;
  }

  pagination(page, limit, total) {
    this.response.pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
    return this;
  }

  errors(errors) {
    this.response.errors = errors;
    return this;
  }

  code(code) {
    this.response.code = code;
    return this;
  }

  status(statusCode) {
    this.response.statusCode = statusCode;
    return this;
  }

  // Chainable methods for common responses
  created(data, message = 'Resource created successfully') {
    return this.success(message).data(data).status(201).send();
  }

  updated(data, message = 'Resource updated successfully') {
    return this.success(message).data(data).status(200).send();
  }

  deleted(message = 'Resource deleted successfully') {
    return this.success(message).status(204).send();
  }

  notFound(resource = 'Resource') {
    return this.error(`${resource} not found`).status(404).send();
  }

  badRequest(message = 'Bad request', errors = null) {
    return this.error(message).errors(errors).status(400).send();
  }

  unauthorized(message = 'Unauthorized') {
    return this.error(message).status(401).send();
  }

  forbidden(message = 'Forbidden') {
    return this.error(message).status(403).send();
  }

  conflict(message = 'Conflict') {
    return this.error(message).status(409).send();
  }

  tooManyRequests(message = 'Too many requests') {
    return this.error(message).status(429).send();
  }

  serverError(message = 'Internal server error') {
    return this.error(message).status(500).send();
  }

  send() {
    const statusCode = this.response.statusCode || 200;
    return this.res.status(statusCode).json(this.response);
  }
}

// Factory function for creating response builders
export const createResponse = (res) => new ResponseBuilder(res);

// Static methods for quick responses
export const Response = {
  success: (res, message, data) => createResponse(res).success(message).data(data).send(),
  created: (res, data, message) => createResponse(res).created(data, message),
  updated: (res, data, message) => createResponse(res).updated(data, message),
  deleted: (res, message) => createResponse(res).deleted(message),
  notFound: (res, resource) => createResponse(res).notFound(resource),
  badRequest: (res, message, errors) => createResponse(res).badRequest(message, errors),
  unauthorized: (res, message) => createResponse(res).unauthorized(message),
  forbidden: (res, message) => createResponse(res).forbidden(message),
  conflict: (res, message) => createResponse(res).conflict(message),
  tooManyRequests: (res, message) => createResponse(res).tooManyRequests(message),
  serverError: (res, message) => createResponse(res).serverError(message),
  paginated: (res, data, pagination, message) => {
    return createResponse(res)
      .success(message || 'Success')
      .data(data)
      .pagination(pagination.page, pagination.limit, pagination.total)
      .send();
  }
};

export default ResponseBuilder;
