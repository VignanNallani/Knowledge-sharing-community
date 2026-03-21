import { z } from 'zod';

export const createCommentSchema = z.object({
	body: z.object({
		content: z.string().min(2),
	}),
});

export const updateCommentSchema = z.object({
	body: z.object({
		content: z.string().min(2),
	}),
});

export default { createCommentSchema, updateCommentSchema };
