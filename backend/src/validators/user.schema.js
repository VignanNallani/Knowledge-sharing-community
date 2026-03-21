import { z } from 'zod';

export const updateProfileSchema = z.object({
	body: z.object({
		bio: z.string().optional(),
		skills: z.array(z.string()).optional(),
		github: z.string().url().optional(),
		linkedin: z.string().url().optional(),
	}),
});

export default { updateProfileSchema };
