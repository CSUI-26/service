import { z } from 'zod';
import {
  GalleryCategorySchema,
  ImageConfigSchema,
  type GalleryCategory,
  type GalleryItemCreate,
} from '@zenith/shared';

export function defaultAspectForGalleryCategory(
  category: GalleryCategory,
  isFeatured: boolean,
): string {
  if (category === 'hero') return '4:7';
  if (category === 'photo' && isFeatured) return '16:9';
  return '4:3';
}

export function slugifyGalleryId(title: string): string {
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

export const galleryFormSchema = z.object({
  id: z.string().trim().min(1, 'ID is required'),
  title: z.string().trim().min(1, 'Title is required'),
  alt: z.string().trim().min(1, 'Alt text is required'),
  category: GalleryCategorySchema,
  isFeatured: z.boolean(),
  position: z
    .number({ message: 'Position must be a number' })
    .int('Position must be an integer')
    .min(0, 'Minimum position is 0'),
  imageUrl: requiredImageUrl,
  imageConfig: ImageConfigSchema.optional(),
});

export type GalleryFormValues = z.infer<typeof galleryFormSchema>;

export function toGalleryPayload(values: GalleryFormValues): GalleryItemCreate {
  const aspect = defaultAspectForGalleryCategory(values.category, values.isFeatured);
  const isFeatured = values.category === 'photo' ? values.isFeatured : false;

  return {
    id: values.id.trim(),
    title: values.title.trim(),
    alt: values.alt.trim(),
    category: values.category,
    isFeatured,
    position: values.position,
    image: {
      url: values.imageUrl.trim(),
      config: values.imageConfig
        ? { ...values.imageConfig, aspect }
        : { x: 50, y: 50, zoom: 1, aspect },
    },
  };
}
