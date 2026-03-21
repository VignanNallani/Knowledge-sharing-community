import { z } from 'zod';

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Verification token is required"),
  }),
});

export const resendVerificationSchema = z.object({
  body: z.object({}), // Empty body, just needs authentication
});

export default { verifyEmailSchema, resendVerificationSchema };
