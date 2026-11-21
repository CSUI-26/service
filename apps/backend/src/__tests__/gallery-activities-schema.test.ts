import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import {
  ActivityCreateSchema,
  ActivityUpdateSchema,
  GalleryItemCreateSchema,
  GalleryItemUpdateSchema,
  PublicGalleryResponseSchema,
} from '@zenith/shared';
import { activities, galleryItems } from '../db/schema.js';

describe('Gallery & Activities schemas', () => {
  it('validates GalleryItemCreateSchema defaults and rejects empty image url or invalid category', () => {
    const parsed = GalleryItemCreateSchema.parse({
      id: 'foto-angkatan-1',
      title: 'Foto Angkatan 1',
      alt: 'Mahasiswa CSUI 2026 di depan Rektorat UI.',
      image: {
        url: 'https://cdn.csui.dev/gallery/foto-angkatan-1.webp',
        config: { x: 50, y: 50, zoom: 1, aspect: '4:3' },
      },
    });
    expect(parsed.category).toBe('photo');
    expect(parsed.isFeatured).toBe(false);
    expect(parsed.position).toBe(0);

    expect(
      GalleryItemCreateSchema.safeParse({
        id: 'bad-image',
        title: 'Bad',
        alt: 'Missing image',
        image: { url: '' },
      }).success,
    ).toBe(false);

    expect(
      GalleryItemCreateSchema.safeParse({
        id: 'bad-cat',
        title: 'Bad',
        alt: 'Bad category',
        category: 'banner',
        image: { url: 'https://cdn.csui.dev/gallery/bad.webp' },
      }).success,
    ).toBe(false);
  });

  it('validates PublicGalleryResponseSchema shape', () => {
    const item = {
      id: 'foto-angkatan-4',
      title: 'Foto Angkatan 4',
      alt: 'Mahasiswa CSUI 2026 membentuk setengah lingkaran.',
      category: 'photo' as const,
      isFeatured: true,
      image: { url: 'https://cdn.csui.dev/gallery/foto-angkatan-4.webp' },
      position: 3,
    };

    const grouped = PublicGalleryResponseSchema.parse({
      photos: [item],
      heroes: [],
      highlights: [],
      featuredPhoto: item,
    });
    expect(grouped.featuredPhoto?.id).toBe('foto-angkatan-4');
  });

  it('validates ActivityCreateSchema defaults and omits defaults on partial updates', () => {
    const parsed = ActivityCreateSchema.parse({
      id: 'psaf',
      title: 'PSAF',
      date: '11-13 Agustus 2026',
      description: 'PSAF membahas kuliah di Fasilkom.',
      image: { url: 'https://cdn.csui.dev/activities/psaf.webp' },
    });
    expect(parsed.position).toBe(0);

    expect(GalleryItemUpdateSchema.parse({ title: 'Updated Photo' })).toEqual({
      title: 'Updated Photo',
    });
    expect(ActivityUpdateSchema.parse({ date: '12 Agustus 2026' })).toEqual({
      date: '12 Agustus 2026',
    });
  });

  it('defines gallery_items and activities Drizzle table columns', () => {
    const galleryCols = getTableColumns(galleryItems);
    expect(Object.keys(galleryCols)).toEqual(
      expect.arrayContaining([
        'id',
        'title',
        'alt',
        'category',
        'isFeatured',
        'image',
        'position',
        'createdAt',
        'updatedAt',
      ]),
    );
    expect(galleryCols.isFeatured.name).toBe('is_featured');

    const activityCols = getTableColumns(activities);
    expect(Object.keys(activityCols)).toEqual(
      expect.arrayContaining([
        'id',
        'title',
        'date',
        'description',
        'image',
        'position',
        'createdAt',
        'updatedAt',
      ]),
    );
  });
});
