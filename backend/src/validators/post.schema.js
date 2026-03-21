import { z } from 'zod';

export const createPostSchema = z.object({
	body: z.object({
		title: z.string().min(5),
		content: z.string().min(20),
		tags: z.array(z.string()).optional(),
	}),
});

export const updatePostSchema = z.object({
	body: z.object({
		title: z.string().min(5).optional(),
		content: z.string().min(20).optional(),
		tags: z.array(z.string()).optional(),
	}),
});

export default { createPostSchema, updatePostSchema };
