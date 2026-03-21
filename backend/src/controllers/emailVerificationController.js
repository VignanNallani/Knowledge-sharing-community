import BaseController from '../base/BaseController.js';
import { ApiError } from '../utils/ApiError.js';
import emailVerificationService from '../services/emailVerification.service.js';
import { logger } from '../config/index.js';
import { Response } from '../utils/ResponseBuilder.js';

class EmailVerificationController extends BaseController {
  static verifyEmail = BaseController.asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return Response.badRequest(res, 'Verification token is required');
    }

    const result = await emailVerificationService.verifyEmail(token);
    return Response.success(res, result, 'Email verified successfully');
  });

  static resendVerification = BaseController.asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      return Response.unauthorized(res, 'Authentication required');
    }

    const result = await emailVerificationService.resendVerification(userId);
    return Response.success(res, result, 'Verification email resent');
  });
}

export default EmailVerificationController;
