import { and, asc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type {
  GalleryCategory,
  GalleryItem,
  GalleryItemCreate,
  GalleryItemUpdate,
  PublicGalleryResponse,
} from '../../schemas/index.js';
import { createTtlCache } from '../../lib/cache.js';
import { db } from '../client.js';
import { galleryItems } from '../schema.js';

const galleryCache = createTtlCache<PublicGalleryResponse>(60_000);

export function invalidateGalleryCache(): void {
  galleryCache.clear();
}

function mapGalleryRow(row: typeof galleryItems.$inferSelect): GalleryItem {
  return {
    id: row.id,
    title: row.title,
    alt: row.alt,
    category: row.category as GalleryCategory,
    isFeatured: row.isFeatured,
    image: row.image,
    position: row.position,
  };
}

function buildGalleryConditions(params: {
  search?: string;
  category?: GalleryCategory;
  isFeatured?: boolean;
}): SQL[] {
  const conditions: SQL[] = [];
  if (params.category !== undefined) conditions.push(eq(galleryItems.category, params.category));
  if (params.isFeatured !== undefined) conditions.push(eq(galleryItems.isFeatured, params.isFeatured));
  if (params.search) {
    const q = `%${params.search}%`;
    const match = or(
      ilike(galleryItems.id, q),
      ilike(galleryItems.title, q),
      ilike(galleryItems.alt, q),
    );
    if (match) conditions.push(match);
  }
  return conditions;
}

export async function countGalleryItems(
  filters: { search?: string; category?: GalleryCategory; isFeatured?: boolean } = {},
): Promise<number> {
  const conditions = buildGalleryConditions(filters);
  let query = db.select({ total: sql<number>`count(*)` }).from(galleryItems).$dynamic();
  if (conditions.length) query = query.where(and(...conditions));
  const rows = await query;
  return Number(rows[0]?.total ?? 0);
}

export async function getAllGalleryItems(
  opts: {
    search?: string;
    category?: GalleryCategory;
    isFeatured?: boolean;
    limit?: number;
    offset?: number;
  } = {},
): Promise<GalleryItem[]> {
  const conditions = buildGalleryConditions(opts);
  let query = db.select().from(galleryItems).$dynamic();
  if (conditions.length) query = query.where(and(...conditions));
  query = query.orderBy(asc(galleryItems.position), asc(galleryItems.id));
  if (opts.limit !== undefined) {
    query = query.limit(opts.limit).offset(opts.offset ?? 0);
  }
  const rows = await query;
  return rows.map(mapGalleryRow);
}

export async function getGroupedGallery(): Promise<PublicGalleryResponse> {
  const cached = galleryCache.get('gallery:grouped');
  if (cached) return cached;

  const rows = await db
    .select()
    .from(galleryItems)
    .orderBy(asc(galleryItems.position), asc(galleryItems.id));

  const photos: GalleryItem[] = [];
  const heroes: GalleryItem[] = [];
  const highlights: GalleryItem[] = [];

  for (const row of rows) {
    const item = mapGalleryRow(row);
    if (item.category === 'hero') {
      heroes.push(item);
    } else if (item.category === 'highlight') {
      highlights.push(item);
    } else {
      photos.push(item);
    }
  }

  const featuredPhoto =
    photos.find((item) => item.isFeatured) ?? photos[photos.length - 1] ?? null;

  const result: PublicGalleryResponse = {
    photos,
    heroes,
    highlights,
    featuredPhoto,
  };
  galleryCache.set('gallery:grouped', result);
  return result;
}

export async function getGalleryItemById(id: string): Promise<GalleryItem | null> {
  const rows = await db.select().from(galleryItems).where(eq(galleryItems.id, id));
  return rows[0] ? mapGalleryRow(rows[0]) : null;
}

export async function createGalleryItem(input: GalleryItemCreate): Promise<GalleryItem> {
  await db.insert(galleryItems).values({
    id: input.id,
    title: input.title,
    alt: input.alt,
    category: input.category ?? 'photo',
    isFeatured: input.isFeatured ?? false,
    image: input.image,
    position: input.position ?? 0,
  });
  invalidateGalleryCache();
  return (await getGalleryItemById(input.id))!;
}

export async function updateGalleryItem(
  id: string,
  updates: GalleryItemUpdate,
): Promise<GalleryItem | null> {
  const existing = await getGalleryItemById(id);
  if (!existing) return null;

  const set: Record<string, unknown> = {};
  if (updates.title !== undefined) set.title = updates.title;
  if (updates.alt !== undefined) set.alt = updates.alt;
  if (updates.category !== undefined) set.category = updates.category;
  if (updates.isFeatured !== undefined) set.isFeatured = updates.isFeatured;
  if (updates.image !== undefined) set.image = updates.image;
  if (updates.position !== undefined) set.position = updates.position;

  if (Object.keys(set).length > 0) {
    set.updatedAt = sql`extract(epoch from now())::int`;
    await db.update(galleryItems).set(set).where(eq(galleryItems.id, id));
    invalidateGalleryCache();
  }
  return getGalleryItemById(id);
}

export async function deleteGalleryItem(id: string): Promise<boolean> {
  const result = await db
    .delete(galleryItems)
    .where(eq(galleryItems.id, id))
    .returning({ id: galleryItems.id });
  if (result.length > 0) {
    invalidateGalleryCache();
    return true;
  }
  return false;
}
