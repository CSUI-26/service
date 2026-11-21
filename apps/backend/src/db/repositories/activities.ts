import { and, asc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { Activity, ActivityCreate, ActivityUpdate } from '../../schemas/index.js';
import { createTtlCache } from '../../lib/cache.js';
import { db } from '../client.js';
import { activities } from '../schema.js';

const activitiesCache = createTtlCache<Activity[]>(60_000);

export function invalidateActivitiesCache(): void {
  activitiesCache.clear();
}

function mapActivityRow(row: typeof activities.$inferSelect): Activity {
  return {
    id: row.id,
    title: row.title,
    date: row.date ?? '',
    description: row.description,
    image: row.image,
    position: row.position,
  };
}

function buildActivityConditions(params: { search?: string }): SQL[] {
  const conditions: SQL[] = [];
  if (params.search) {
    const q = `%${params.search}%`;
    const match = or(
      ilike(activities.id, q),
      ilike(activities.title, q),
      ilike(activities.date, q),
      ilike(activities.description, q),
    );
    if (match) conditions.push(match);
  }
  return conditions;
}

export async function countActivities(filters: { search?: string } = {}): Promise<number> {
  const conditions = buildActivityConditions(filters);
  let query = db.select({ total: sql<number>`count(*)` }).from(activities).$dynamic();
  if (conditions.length) query = query.where(and(...conditions));
  const rows = await query;
  return Number(rows[0]?.total ?? 0);
}

export async function getAllActivities(
  opts: { search?: string; limit?: number; offset?: number } = {},
): Promise<Activity[]> {
  const isUnfiltered = !opts.search && opts.limit === undefined && opts.offset === undefined;
  if (isUnfiltered) {
    const cached = activitiesCache.get('activities:all');
    if (cached) return cached;
  }

  const conditions = buildActivityConditions(opts);
  let query = db.select().from(activities).$dynamic();
  if (conditions.length) query = query.where(and(...conditions));
  query = query.orderBy(asc(activities.position), asc(activities.id));
  if (opts.limit !== undefined) {
    query = query.limit(opts.limit).offset(opts.offset ?? 0);
  }
  const rows = await query;
  const mapped = rows.map(mapActivityRow);

  if (isUnfiltered) {
    activitiesCache.set('activities:all', mapped);
  }
  return mapped;
}

export async function getActivityById(id: string): Promise<Activity | null> {
  const rows = await db.select().from(activities).where(eq(activities.id, id));
  return rows[0] ? mapActivityRow(rows[0]) : null;
}

export async function createActivity(input: ActivityCreate): Promise<Activity> {
  await db.insert(activities).values({
    id: input.id,
    title: input.title,
    date: input.date || null,
    description: input.description,
    image: input.image,
    position: input.position ?? 0,
  });
  invalidateActivitiesCache();
  return (await getActivityById(input.id))!;
}

export async function updateActivity(
  id: string,
  updates: ActivityUpdate,
): Promise<Activity | null> {
  const existing = await getActivityById(id);
  if (!existing) return null;

  const set: Record<string, unknown> = {};
  if (updates.title !== undefined) set.title = updates.title;
  if (updates.date !== undefined) set.date = updates.date || null;
  if (updates.description !== undefined) set.description = updates.description;
  if (updates.image !== undefined) set.image = updates.image;
  if (updates.position !== undefined) set.position = updates.position;

  if (Object.keys(set).length > 0) {
    set.updatedAt = sql`extract(epoch from now())::int`;
    await db.update(activities).set(set).where(eq(activities.id, id));
    invalidateActivitiesCache();
  }
  return getActivityById(id);
}

export async function deleteActivity(id: string): Promise<boolean> {
  const result = await db
    .delete(activities)
    .where(eq(activities.id, id))
    .returning({ id: activities.id });
  if (result.length > 0) {
    invalidateActivitiesCache();
    return true;
  }
  return false;
}
