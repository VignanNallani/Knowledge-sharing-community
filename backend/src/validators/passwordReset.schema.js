import { z } from 'zod';

export const requestResetSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

export const validateTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
  }),
});

export default { requestResetSchema, resetPasswordSchema, validateTokenSchema };
