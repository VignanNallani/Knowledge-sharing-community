import BaseController from '../base/BaseController.js';
import { ApiError } from '../utils/ApiError.js';
import passwordResetService from '../services/passwordReset.service.js';
import { logger } from '../config/index.js';
import { Response } from '../utils/ResponseBuilder.js';

class PasswordResetController extends BaseController {
  static requestReset = BaseController.asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return Response.badRequest(res, 'Email is required');
    }

    const result = await passwordResetService.generateResetToken(email);
    return Response.success(res, result, 'Password reset link sent');
  });

  static resetPassword = BaseController.asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return Response.badRequest(res, 'Token and new password are required');
    }

    const result = await passwordResetService.resetPassword(token, newPassword);
    return Response.success(res, result, 'Password reset successfully');
  });

  static validateToken = BaseController.asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return Response.badRequest(res, 'Reset token is required');
    }

    const result = await passwordResetService.validateResetToken(token);
    return Response.success(res, result, 'Token validation result');
  });
}

export default PasswordResetController;
