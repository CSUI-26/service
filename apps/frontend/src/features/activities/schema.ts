import { z } from 'zod';
import { ImageConfigSchema, type ActivityCreate } from '@zenith/shared';

export function slugifyActivityId(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const requiredImageUrl = z
  .string()
  .trim()
  .min(1, 'Image is required')
  .refine(
    (value) => /^(https?:\/\/|\/)/.test(value),
    'Image URL must start with http://, https://, or /',
  );

export const activityFormSchema = z.object({
  id: z.string().trim().min(1, 'ID is required'),
  title: z.string().trim().min(1, 'Title is required'),
  date: z.string(),
  description: z.string().trim().min(1, 'Description is required'),
  position: z
    .number({ message: 'Position must be a number' })
    .int('Position must be an integer')
    .min(0, 'Minimum position is 0'),
  imageUrl: requiredImageUrl,
  imageConfig: ImageConfigSchema.optional(),
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

export function toActivityPayload(values: ActivityFormValues): ActivityCreate {
  return {
    id: values.id.trim(),
    title: values.title.trim(),
    date: values.date.trim(),
    description: values.description.trim(),
    position: values.position,
    image: {
      url: values.imageUrl.trim(),
      config: values.imageConfig
        ? { ...values.imageConfig, aspect: '16:9' }
        : { x: 50, y: 50, zoom: 1, aspect: '16:9' },
    },
  };
}
