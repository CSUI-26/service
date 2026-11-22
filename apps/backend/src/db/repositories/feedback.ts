import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type {
  FeedbackCategory,
  FeedbackMessage,
  FeedbackMessageCreate,
  FeedbackMessageUpdate,
  FeedbackThreadCreate,
  FeedbackThreadDetail,
  FeedbackThreadSummary,
  FeedbackThreadUpdate,
  RequestAuthor,
  RequestStatus,
} from '../../schemas/index.js';
import { db } from '../client.js';
import { feedbackMessages, feedbackThreads, members } from '../schema.js';

async function fetchAuthorsMap(npms: string[]): Promise<Map<string, RequestAuthor>> {
  const unique = Array.from(new Set(npms.filter(Boolean)));
  const map = new Map<string, RequestAuthor>();
  if (unique.length === 0) return map;

  const rows = await db
    .select({
      npm: members.npm,
      name: members.name,
      namaPanggilan: members.namaPanggilan,
      foto: members.foto,
    })
    .from(members)
    .where(inArray(members.npm, unique));

  for (const row of rows) {
    map.set(row.npm, {
      npm: row.npm,
      name: row.name,
      nama_panggilan: row.namaPanggilan,
      foto: row.foto,
    });
  }
  return map;
}

async function fetchMessageCountsMap(threadIds: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (threadIds.length === 0) return map;

  const rows = await db
    .select({
      threadId: feedbackMessages.threadId,
      total: sql<number>`count(*)::int`,
    })
    .from(feedbackMessages)
    .where(inArray(feedbackMessages.threadId, threadIds))
    .groupBy(feedbackMessages.threadId);

  for (const row of rows) {
    map.set(row.threadId, Number(row.total ?? 0));
  }
  return map;
}

function normalizeExternalUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapSummary(
  row: typeof feedbackThreads.$inferSelect,
  authors: Map<string, RequestAuthor>,
  messageCounts: Map<number, number>,
): FeedbackThreadSummary {
  return {
    id: row.id,
    authorNpm: row.authorNpm,
    author: authors.get(row.authorNpm),
    category: row.category as FeedbackCategory,
    title: row.title,
    description: row.description,
    status: row.status as RequestStatus,
    image: row.image ?? null,
    externalUrl: row.externalUrl ?? null,
    messageCount: messageCounts.get(row.id) ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapMessageRow(
  row: typeof feedbackMessages.$inferSelect,
  authors: Map<string, RequestAuthor>,
): FeedbackMessage {
  return {
    id: row.id,
    threadId: row.threadId,
    authorNpm: row.authorNpm,
    authorRole: row.authorRole as 'user' | 'admin',
    author: authors.get(row.authorNpm),
    body: row.body,
    image: row.image ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function buildConditions(filters: {
  authorNpm?: string;
  category?: FeedbackCategory;
  status?: RequestStatus;
  search?: string;
}): SQL[] {
  const conditions: SQL[] = [];
  if (filters.authorNpm !== undefined) {
    conditions.push(eq(feedbackThreads.authorNpm, filters.authorNpm));
  }
  if (filters.category !== undefined) {
    conditions.push(eq(feedbackThreads.category, filters.category));
  }
  if (filters.status !== undefined) {
    conditions.push(eq(feedbackThreads.status, filters.status));
  }
  if (filters.search) {
    const q = `%${filters.search}%`;
    const match = or(
      ilike(feedbackThreads.title, q),
      ilike(feedbackThreads.description, q),
      ilike(feedbackThreads.authorNpm, q),
    );
    if (match) conditions.push(match);
  }
  return conditions;
}

export async function getFeedbackThreads(
  options: {
    authorNpm?: string;
    category?: FeedbackCategory;
    status?: RequestStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<{
  data: FeedbackThreadSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions = buildConditions(options);
  let countQuery = db.select({ total: sql<number>`count(*)::int` }).from(feedbackThreads).$dynamic();
  if (conditions.length) countQuery = countQuery.where(and(...conditions));
  const countRows = await countQuery;
  const total = Number(countRows[0]?.total ?? 0);

  let rowsQuery = db.select().from(feedbackThreads).$dynamic();
  if (conditions.length) rowsQuery = rowsQuery.where(and(...conditions));
  const rows = await rowsQuery
    .orderBy(desc(feedbackThreads.updatedAt), desc(feedbackThreads.id))
    .limit(limit)
    .offset(offset);

  const threadIds = rows.map((r) => r.id);
  const authorNpms = rows.map((r) => r.authorNpm);

  const [authors, messageCounts] = await Promise.all([
    fetchAuthorsMap(authorNpms),
    fetchMessageCountsMap(threadIds),
  ]);

  return {
    data: rows.map((row) => mapSummary(row, authors, messageCounts)),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getFeedbackThreadById(id: number): Promise<FeedbackThreadDetail | undefined> {
  const rows = await db.select().from(feedbackThreads).where(eq(feedbackThreads.id, id));
  const row = rows[0];
  if (!row) return undefined;

  const msgRows = await db
    .select()
    .from(feedbackMessages)
    .where(eq(feedbackMessages.threadId, id))
    .orderBy(asc(feedbackMessages.createdAt), asc(feedbackMessages.id));

  const npms = [row.authorNpm, ...msgRows.map((m) => m.authorNpm)];
  const authors = await fetchAuthorsMap(npms);
  const counts = new Map<number, number>([[id, msgRows.length]]);

  return {
    ...mapSummary(row, authors, counts),
    messages: msgRows.map((m) => mapMessageRow(m, authors)),
  };
}

export async function createFeedbackThread(
  authorNpm: string,
  data: FeedbackThreadCreate,
): Promise<FeedbackThreadDetail> {
  const [inserted] = await db
    .insert(feedbackThreads)
    .values({
      authorNpm,
      category: data.category ?? 'feedback',
      title: data.title,
      description: data.description,
      status: 'open',
      image: data.image ?? null,
      externalUrl: normalizeExternalUrl(data.externalUrl),
    })
    .returning();

  return (await getFeedbackThreadById(inserted.id))!;
}

export async function updateFeedbackThread(
  id: number,
  data: FeedbackThreadUpdate,
): Promise<FeedbackThreadDetail | undefined> {
  const existing = await db.select().from(feedbackThreads).where(eq(feedbackThreads.id, id));
  if (!existing[0]) return undefined;

  const set: Record<string, unknown> = {};
  if (data.category !== undefined) set.category = data.category;
  if (data.title !== undefined) set.title = data.title;
  if (data.description !== undefined) set.description = data.description;
  if (data.status !== undefined) set.status = data.status;
  if (data.image !== undefined) set.image = data.image;
  if (data.externalUrl !== undefined) set.externalUrl = normalizeExternalUrl(data.externalUrl);

  if (Object.keys(set).length > 0) {
    set.updatedAt = sql`extract(epoch from now())::int`;
    await db.update(feedbackThreads).set(set).where(eq(feedbackThreads.id, id));
  }

  return getFeedbackThreadById(id);
}

export async function deleteFeedbackThread(id: number): Promise<boolean> {
  const result = await db
    .delete(feedbackThreads)
    .where(eq(feedbackThreads.id, id))
    .returning({ id: feedbackThreads.id });
  return result.length > 0;
}

export async function getFeedbackMessageById(
  messageId: number,
): Promise<FeedbackMessage | undefined> {
  const rows = await db
    .select()
    .from(feedbackMessages)
    .where(eq(feedbackMessages.id, messageId));
  const row = rows[0];
  if (!row) return undefined;
  const authors = await fetchAuthorsMap([row.authorNpm]);
  return mapMessageRow(row, authors);
}

export async function createFeedbackMessage(
  threadId: number,
  authorNpm: string,
  authorRole: 'user' | 'admin',
  data: FeedbackMessageCreate,
): Promise<FeedbackMessage> {
  const inserted = await db.transaction(async (tx) => {
    const [msg] = await tx
      .insert(feedbackMessages)
      .values({
        threadId,
        authorNpm,
        authorRole,
        body: data.body,
        image: data.image ?? null,
      })
      .returning();

    await tx
      .update(feedbackThreads)
      .set({ updatedAt: sql`extract(epoch from now())::int` })
      .where(eq(feedbackThreads.id, threadId));

    return msg;
  });

  const authors = await fetchAuthorsMap([inserted.authorNpm]);
  return mapMessageRow(inserted, authors);
}

export async function updateFeedbackMessage(
  threadId: number,
  messageId: number,
  data: FeedbackMessageUpdate,
): Promise<FeedbackMessage | undefined> {
  const updated = await db.transaction(async (tx) => {
    const set: Record<string, unknown> = {};
    if (data.body !== undefined) set.body = data.body;
    if (data.image !== undefined) set.image = data.image;
    set.updatedAt = sql`extract(epoch from now())::int`;

    const rows = await tx
      .update(feedbackMessages)
      .set(set)
      .where(and(eq(feedbackMessages.id, messageId), eq(feedbackMessages.threadId, threadId)))
      .returning();

    if (!rows[0]) return undefined;

    await tx
      .update(feedbackThreads)
      .set({ updatedAt: sql`extract(epoch from now())::int` })
      .where(eq(feedbackThreads.id, threadId));

    return rows[0];
  });

  if (!updated) return undefined;
  const authors = await fetchAuthorsMap([updated.authorNpm]);
  return mapMessageRow(updated, authors);
}

export async function deleteFeedbackMessage(threadId: number, messageId: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .delete(feedbackMessages)
      .where(and(eq(feedbackMessages.id, messageId), eq(feedbackMessages.threadId, threadId)))
      .returning({ id: feedbackMessages.id });

    if (rows.length === 0) return false;

    await tx
      .update(feedbackThreads)
      .set({ updatedAt: sql`extract(epoch from now())::int` })
      .where(eq(feedbackThreads.id, threadId));

    return true;
  });
}
