import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type {
  RequestAuthor,
  RequestCategory,
  RequestMessage,
  RequestMessageCreate,
  RequestMessageUpdate,
  RequestStatus,
  RequestThreadCreate,
  RequestThreadDetail,
  RequestThreadSummary,
  RequestThreadUpdate,
} from '../../schemas/index.js';
import { db } from '../client.js';
import { members, requestMessages, requestThreads } from '../schema.js';

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
      threadId: requestMessages.threadId,
      total: sql<number>`count(*)::int`,
    })
    .from(requestMessages)
    .where(inArray(requestMessages.threadId, threadIds))
    .groupBy(requestMessages.threadId);

  for (const row of rows) {
    map.set(row.threadId, Number(row.total ?? 0));
  }
  return map;
}

function mapThreadSummary(
  row: typeof requestThreads.$inferSelect,
  authors: Map<string, RequestAuthor>,
  messageCounts: Map<number, number>,
): RequestThreadSummary {
  return {
    id: row.id,
    authorNpm: row.authorNpm,
    author: authors.get(row.authorNpm),
    category: row.category as RequestCategory,
    title: row.title,
    description: row.description,
    status: row.status as RequestStatus,
    image: row.image ?? null,
    metadata: row.metadata ?? {},
    messageCount: messageCounts.get(row.id) ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapMessageRow(
  row: typeof requestMessages.$inferSelect,
  authors: Map<string, RequestAuthor>,
): RequestMessage {
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

function buildThreadConditions(filters: {
  authorNpm?: string;
  category?: RequestCategory;
  status?: RequestStatus;
  search?: string;
}): SQL[] {
  const conditions: SQL[] = [];
  if (filters.authorNpm !== undefined) {
    conditions.push(eq(requestThreads.authorNpm, filters.authorNpm));
  }
  if (filters.category !== undefined) {
    conditions.push(eq(requestThreads.category, filters.category));
  }
  if (filters.status !== undefined) {
    conditions.push(eq(requestThreads.status, filters.status));
  }
  if (filters.search) {
    const q = `%${filters.search}%`;
    const match = or(
      ilike(requestThreads.title, q),
      ilike(requestThreads.description, q),
      ilike(requestThreads.authorNpm, q),
    );
    if (match) conditions.push(match);
  }
  return conditions;
}

export async function getRequestThreads(
  options: {
    authorNpm?: string;
    category?: RequestCategory;
    status?: RequestStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<{
  data: RequestThreadSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions = buildThreadConditions(options);
  let countQuery = db.select({ total: sql<number>`count(*)::int` }).from(requestThreads).$dynamic();
  if (conditions.length) countQuery = countQuery.where(and(...conditions));
  const countRows = await countQuery;
  const total = Number(countRows[0]?.total ?? 0);

  let rowsQuery = db.select().from(requestThreads).$dynamic();
  if (conditions.length) rowsQuery = rowsQuery.where(and(...conditions));
  const rows = await rowsQuery
    .orderBy(desc(requestThreads.updatedAt), desc(requestThreads.id))
    .limit(limit)
    .offset(offset);

  const threadIds = rows.map((r) => r.id);
  const authorNpms = rows.map((r) => r.authorNpm);

  const [authors, messageCounts] = await Promise.all([
    fetchAuthorsMap(authorNpms),
    fetchMessageCountsMap(threadIds),
  ]);

  return {
    data: rows.map((row) => mapThreadSummary(row, authors, messageCounts)),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getRequestThreadById(id: number): Promise<RequestThreadDetail | undefined> {
  const rows = await db.select().from(requestThreads).where(eq(requestThreads.id, id));
  const threadRow = rows[0];
  if (!threadRow) return undefined;

  const msgRows = await db
    .select()
    .from(requestMessages)
    .where(eq(requestMessages.threadId, id))
    .orderBy(asc(requestMessages.createdAt), asc(requestMessages.id));

  const npms = [threadRow.authorNpm, ...msgRows.map((m) => m.authorNpm)];
  const authors = await fetchAuthorsMap(npms);
  const counts = new Map<number, number>([[id, msgRows.length]]);

  return {
    ...mapThreadSummary(threadRow, authors, counts),
    messages: msgRows.map((m) => mapMessageRow(m, authors)),
  };
}

export async function createRequestThread(
  authorNpm: string,
  data: RequestThreadCreate,
): Promise<RequestThreadDetail> {
  const [inserted] = await db
    .insert(requestThreads)
    .values({
      authorNpm,
      category: data.category ?? 'content',
      title: data.title,
      description: data.description,
      status: 'open',
      image: data.image ?? null,
      metadata: data.metadata ?? {},
    })
    .returning();

  return (await getRequestThreadById(inserted.id))!;
}

export async function updateRequestThread(
  id: number,
  data: RequestThreadUpdate,
): Promise<RequestThreadDetail | undefined> {
  const existing = await db.select().from(requestThreads).where(eq(requestThreads.id, id));
  if (!existing[0]) return undefined;

  const set: Record<string, unknown> = {};
  if (data.category !== undefined) set.category = data.category;
  if (data.title !== undefined) set.title = data.title;
  if (data.description !== undefined) set.description = data.description;
  if (data.status !== undefined) set.status = data.status;
  if (data.image !== undefined) set.image = data.image;
  if (data.metadata !== undefined) set.metadata = data.metadata;

  if (Object.keys(set).length > 0) {
    set.updatedAt = sql`extract(epoch from now())::int`;
    await db.update(requestThreads).set(set).where(eq(requestThreads.id, id));
  }

  return getRequestThreadById(id);
}

export async function deleteRequestThread(id: number): Promise<boolean> {
  const result = await db
    .delete(requestThreads)
    .where(eq(requestThreads.id, id))
    .returning({ id: requestThreads.id });
  return result.length > 0;
}

export async function getRequestMessageById(messageId: number): Promise<RequestMessage | undefined> {
  const rows = await db.select().from(requestMessages).where(eq(requestMessages.id, messageId));
  const row = rows[0];
  if (!row) return undefined;
  const authors = await fetchAuthorsMap([row.authorNpm]);
  return mapMessageRow(row, authors);
}

export async function createRequestMessage(
  threadId: number,
  authorNpm: string,
  authorRole: 'user' | 'admin',
  data: RequestMessageCreate,
): Promise<RequestMessage> {
  const inserted = await db.transaction(async (tx) => {
    const [msg] = await tx
      .insert(requestMessages)
      .values({
        threadId,
        authorNpm,
        authorRole,
        body: data.body,
        image: data.image ?? null,
      })
      .returning();

    await tx
      .update(requestThreads)
      .set({ updatedAt: sql`extract(epoch from now())::int` })
      .where(eq(requestThreads.id, threadId));

    return msg;
  });

  const authors = await fetchAuthorsMap([inserted.authorNpm]);
  return mapMessageRow(inserted, authors);
}

export async function updateRequestMessage(
  threadId: number,
  messageId: number,
  data: RequestMessageUpdate,
): Promise<RequestMessage | undefined> {
  const updated = await db.transaction(async (tx) => {
    const set: Record<string, unknown> = {};
    if (data.body !== undefined) set.body = data.body;
    if (data.image !== undefined) set.image = data.image;
    set.updatedAt = sql`extract(epoch from now())::int`;

    const rows = await tx
      .update(requestMessages)
      .set(set)
      .where(and(eq(requestMessages.id, messageId), eq(requestMessages.threadId, threadId)))
      .returning();

    if (!rows[0]) return undefined;

    await tx
      .update(requestThreads)
      .set({ updatedAt: sql`extract(epoch from now())::int` })
      .where(eq(requestThreads.id, threadId));

    return rows[0];
  });

  if (!updated) return undefined;
  const authors = await fetchAuthorsMap([updated.authorNpm]);
  return mapMessageRow(updated, authors);
}

export async function deleteRequestMessage(threadId: number, messageId: number): Promise<boolean> {
  const deleted = await db.transaction(async (tx) => {
    const rows = await tx
      .delete(requestMessages)
      .where(and(eq(requestMessages.id, messageId), eq(requestMessages.threadId, threadId)))
      .returning({ id: requestMessages.id });

    if (rows.length === 0) return false;

    await tx
      .update(requestThreads)
      .set({ updatedAt: sql`extract(epoch from now())::int` })
      .where(eq(requestThreads.id, threadId));

    return true;
  });

  return deleted;
}
