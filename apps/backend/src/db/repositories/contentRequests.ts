import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type {
  ContentRequestCreate,
  ContentRequestDetail,
  ContentRequestMessage,
  ContentRequestMessageCreate,
  ContentRequestMessageUpdate,
  ContentRequestMetadata,
  ContentRequestSummary,
  ContentRequestType,
  ContentRequestUpdate,
  RequestAuthor,
  RequestStatus,
} from '../../schemas/index.js';
import { db } from '../client.js';
import { contentRequestMessages, contentRequests, members } from '../schema.js';

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

async function fetchMessageCountsMap(requestIds: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (requestIds.length === 0) return map;

  const rows = await db
    .select({
      requestId: contentRequestMessages.requestId,
      total: sql<number>`count(*)::int`,
    })
    .from(contentRequestMessages)
    .where(inArray(contentRequestMessages.requestId, requestIds))
    .groupBy(contentRequestMessages.requestId);

  for (const row of rows) {
    map.set(row.requestId, Number(row.total ?? 0));
  }
  return map;
}

function sanitizeContentMetadata(
  contentType: ContentRequestType,
  metadata: ContentRequestMetadata | undefined,
): ContentRequestMetadata {
  const raw = metadata ?? {};
  if (contentType !== 'achievement') return raw;
  const { externalUrl: _ignored, ...rest } = raw;
  return rest;
}

function mapSummary(
  row: typeof contentRequests.$inferSelect,
  authors: Map<string, RequestAuthor>,
  messageCounts: Map<number, number>,
): ContentRequestSummary {
  return {
    id: row.id,
    authorNpm: row.authorNpm,
    author: authors.get(row.authorNpm),
    contentType: row.contentType as ContentRequestType,
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
  row: typeof contentRequestMessages.$inferSelect,
  authors: Map<string, RequestAuthor>,
): ContentRequestMessage {
  return {
    id: row.id,
    requestId: row.requestId,
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
  contentType?: ContentRequestType;
  status?: RequestStatus;
  search?: string;
}): SQL[] {
  const conditions: SQL[] = [];
  if (filters.authorNpm !== undefined) {
    conditions.push(eq(contentRequests.authorNpm, filters.authorNpm));
  }
  if (filters.contentType !== undefined) {
    conditions.push(eq(contentRequests.contentType, filters.contentType));
  }
  if (filters.status !== undefined) {
    conditions.push(eq(contentRequests.status, filters.status));
  }
  if (filters.search) {
    const q = `%${filters.search}%`;
    const match = or(
      ilike(contentRequests.title, q),
      ilike(contentRequests.description, q),
      ilike(contentRequests.authorNpm, q),
    );
    if (match) conditions.push(match);
  }
  return conditions;
}

export async function getContentRequests(
  options: {
    authorNpm?: string;
    contentType?: ContentRequestType;
    status?: RequestStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<{
  data: ContentRequestSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions = buildConditions(options);
  let countQuery = db.select({ total: sql<number>`count(*)::int` }).from(contentRequests).$dynamic();
  if (conditions.length) countQuery = countQuery.where(and(...conditions));
  const countRows = await countQuery;
  const total = Number(countRows[0]?.total ?? 0);

  let rowsQuery = db.select().from(contentRequests).$dynamic();
  if (conditions.length) rowsQuery = rowsQuery.where(and(...conditions));
  const rows = await rowsQuery
    .orderBy(desc(contentRequests.updatedAt), desc(contentRequests.id))
    .limit(limit)
    .offset(offset);

  const requestIds = rows.map((r) => r.id);
  const authorNpms = rows.map((r) => r.authorNpm);

  const [authors, messageCounts] = await Promise.all([
    fetchAuthorsMap(authorNpms),
    fetchMessageCountsMap(requestIds),
  ]);

  return {
    data: rows.map((row) => mapSummary(row, authors, messageCounts)),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getContentRequestById(id: number): Promise<ContentRequestDetail | undefined> {
  const rows = await db.select().from(contentRequests).where(eq(contentRequests.id, id));
  const row = rows[0];
  if (!row) return undefined;

  const msgRows = await db
    .select()
    .from(contentRequestMessages)
    .where(eq(contentRequestMessages.requestId, id))
    .orderBy(asc(contentRequestMessages.createdAt), asc(contentRequestMessages.id));

  const npms = [row.authorNpm, ...msgRows.map((m) => m.authorNpm)];
  const authors = await fetchAuthorsMap(npms);
  const counts = new Map<number, number>([[id, msgRows.length]]);

  return {
    ...mapSummary(row, authors, counts),
    messages: msgRows.map((m) => mapMessageRow(m, authors)),
  };
}

export async function createContentRequest(
  authorNpm: string,
  data: ContentRequestCreate,
): Promise<ContentRequestDetail> {
  const contentType = data.contentType ?? 'achievement';
  const [inserted] = await db
    .insert(contentRequests)
    .values({
      authorNpm,
      contentType,
      title: data.title,
      description: data.description,
      status: 'open',
      image: data.image ?? null,
      metadata: sanitizeContentMetadata(contentType, data.metadata),
    })
    .returning();

  return (await getContentRequestById(inserted.id))!;
}

export async function updateContentRequest(
  id: number,
  data: ContentRequestUpdate,
): Promise<ContentRequestDetail | undefined> {
  const existing = await db.select().from(contentRequests).where(eq(contentRequests.id, id));
  const current = existing[0];
  if (!current) return undefined;

  const nextContentType = (data.contentType ?? current.contentType) as ContentRequestType;
  const set: Record<string, unknown> = {};
  if (data.contentType !== undefined) set.contentType = data.contentType;
  if (data.title !== undefined) set.title = data.title;
  if (data.description !== undefined) set.description = data.description;
  if (data.status !== undefined) set.status = data.status;
  if (data.image !== undefined) set.image = data.image;
  if (data.metadata !== undefined) {
    set.metadata = sanitizeContentMetadata(nextContentType, data.metadata);
  } else if (data.contentType === 'achievement' && current.contentType !== 'achievement') {
    set.metadata = sanitizeContentMetadata('achievement', current.metadata ?? {});
  }

  if (Object.keys(set).length > 0) {
    set.updatedAt = sql`extract(epoch from now())::int`;
    await db.update(contentRequests).set(set).where(eq(contentRequests.id, id));
  }

  return getContentRequestById(id);
}

export async function deleteContentRequest(id: number): Promise<boolean> {
  const result = await db
    .delete(contentRequests)
    .where(eq(contentRequests.id, id))
    .returning({ id: contentRequests.id });
  return result.length > 0;
}

export async function getContentRequestMessageById(
  messageId: number,
): Promise<ContentRequestMessage | undefined> {
  const rows = await db
    .select()
    .from(contentRequestMessages)
    .where(eq(contentRequestMessages.id, messageId));
  const row = rows[0];
  if (!row) return undefined;
  const authors = await fetchAuthorsMap([row.authorNpm]);
  return mapMessageRow(row, authors);
}

export async function createContentRequestMessage(
  requestId: number,
  authorNpm: string,
  authorRole: 'user' | 'admin',
  data: ContentRequestMessageCreate,
): Promise<ContentRequestMessage> {
  const inserted = await db.transaction(async (tx) => {
    const [msg] = await tx
      .insert(contentRequestMessages)
      .values({
        requestId,
        authorNpm,
        authorRole,
        body: data.body,
        image: data.image ?? null,
      })
      .returning();

    await tx
      .update(contentRequests)
      .set({ updatedAt: sql`extract(epoch from now())::int` })
      .where(eq(contentRequests.id, requestId));

    return msg;
  });

  const authors = await fetchAuthorsMap([inserted.authorNpm]);
  return mapMessageRow(inserted, authors);
}

export async function updateContentRequestMessage(
  requestId: number,
  messageId: number,
  data: ContentRequestMessageUpdate,
): Promise<ContentRequestMessage | undefined> {
  const updated = await db.transaction(async (tx) => {
    const set: Record<string, unknown> = {};
    if (data.body !== undefined) set.body = data.body;
    if (data.image !== undefined) set.image = data.image;
    set.updatedAt = sql`extract(epoch from now())::int`;

    const rows = await tx
      .update(contentRequestMessages)
      .set(set)
      .where(
        and(eq(contentRequestMessages.id, messageId), eq(contentRequestMessages.requestId, requestId)),
      )
      .returning();

    if (!rows[0]) return undefined;

    await tx
      .update(contentRequests)
      .set({ updatedAt: sql`extract(epoch from now())::int` })
      .where(eq(contentRequests.id, requestId));

    return rows[0];
  });

  if (!updated) return undefined;
  const authors = await fetchAuthorsMap([updated.authorNpm]);
  return mapMessageRow(updated, authors);
}

export async function deleteContentRequestMessage(
  requestId: number,
  messageId: number,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .delete(contentRequestMessages)
      .where(
        and(eq(contentRequestMessages.id, messageId), eq(contentRequestMessages.requestId, requestId)),
      )
      .returning({ id: contentRequestMessages.id });

    if (rows.length === 0) return false;

    await tx
      .update(contentRequests)
      .set({ updatedAt: sql`extract(epoch from now())::int` })
      .where(eq(contentRequests.id, requestId));

    return true;
  });
}
