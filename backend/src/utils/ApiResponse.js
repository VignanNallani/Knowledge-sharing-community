import { Response } from './ResponseBuilder.js';

// Legacy ApiResponse class for backward compatibility
class ApiResponse {
  static _send(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(payload));
  }

  static success(res, options = {}) {
    const { message = 'Success', data = null, meta = {} } = options;
    return Response.success(res, message, data);
  }

  static created(res, { message = 'Created', data = null } = {}) {
    return Response.created(res, data, message);
  }

  static error(res, status = 500, message = 'Internal server error') {
    if (status >= 500) {
      return Response.serverError(res, message);
    } else if (status === 404) {
      return Response.notFound(res, message);
    } else if (status === 401) {
      return Response.unauthorized(res, message);
    } else if (status === 403) {
      return Response.forbidden(res, message);
    } else if (status === 409) {
      return Response.conflict(res, message);
    } else if (status === 400) {
      return Response.badRequest(res, message);
    } else {
      return Response.serverError(res, message);
    }
  }
}

export default ApiResponse;
export { Response };

