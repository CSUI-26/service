import type { FastifyInstance } from 'fastify';
import { blockUnauthorized, requireWhitelisted } from '../middleware/auth.js';
import * as repo from '../db/repository.js';
import {
  ContentRequestCreateSchema,
  ContentRequestMessageCreateSchema,
  ContentRequestMessageUpdateSchema,
  ContentRequestTypeSchema,
  ContentRequestUpdateSchema,
  RequestStatusSchema,
} from '../schemas/index.js';
import { parsePaging } from './courses.js';

function parsePositiveId(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export async function contentRequestRoutes(fastify: FastifyInstance) {
  const preHandler = [blockUnauthorized(), requireWhitelisted()];

  fastify.get('/api/v1/content-requests', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const query = req.query as {
      contentType?: string;
      status?: string;
      search?: string;
      scope?: string;
      page?: string;
      limit?: string;
    };

    const { page, limit } = parsePaging(query);
    const parsedType =
      query.contentType && query.contentType !== ''
        ? ContentRequestTypeSchema.safeParse(query.contentType)
        : null;
    const parsedStatus =
      query.status && query.status !== ''
        ? RequestStatusSchema.safeParse(query.status)
        : null;

    const forceMine = !req.user?.isAdmin || query.scope === 'mine';

    return repo.getContentRequests({
      authorNpm: forceMine ? req.user!.npm! : undefined,
      contentType: parsedType?.success ? parsedType.data : undefined,
      status: parsedStatus?.success ? parsedStatus.data : undefined,
      search: query.search?.trim() || undefined,
      page,
      limit,
    });
  });

  fastify.post('/api/v1/content-requests', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const body = ContentRequestCreateSchema.parse(req.body);
    if (body.contentType === 'achievement' && body.metadata?.externalUrl !== undefined) {
      const { externalUrl: _ignored, ...rest } = body.metadata;
      body.metadata = rest;
    }
    const created = await repo.createContentRequest(req.user!.npm!, body);
    return reply.code(201).send({ data: created });
  });

  fastify.get('/api/v1/content-requests/:id', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const id = parsePositiveId((req.params as { id: string }).id);
    if (!id) return reply.code(400).send({ error: 'Invalid content request ID' });

    const item = await repo.getContentRequestById(id);
    if (!item) return reply.code(404).send({ error: 'Content request not found' });

    if (!req.user?.isAdmin && item.authorNpm !== req.user?.npm) {
      return reply.code(403).send({ error: 'Forbidden: thread belongs to another member' });
    }

    return { data: item };
  });

  fastify.put('/api/v1/content-requests/:id', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const id = parsePositiveId((req.params as { id: string }).id);
    if (!id) return reply.code(400).send({ error: 'Invalid content request ID' });

    const item = await repo.getContentRequestById(id);
    if (!item) return reply.code(404).send({ error: 'Content request not found' });

    if (!req.user?.isAdmin && item.authorNpm !== req.user?.npm) {
      return reply.code(403).send({ error: 'Forbidden: thread belongs to another member' });
    }

    const body = ContentRequestUpdateSchema.parse(req.body);
    if (!req.user?.isAdmin && body.status !== undefined && body.status !== 'closed') {
      return reply.code(403).send({ error: 'Forbidden: members can only close their own threads' });
    }

    const effectiveType = body.contentType ?? item.contentType;
    if (effectiveType === 'achievement' && body.metadata?.externalUrl !== undefined) {
      const { externalUrl: _ignored, ...rest } = body.metadata;
      body.metadata = rest;
    }

    const updated = await repo.updateContentRequest(id, body);
    if (!updated) return reply.code(404).send({ error: 'Content request not found' });
    return { data: updated };
  });

  fastify.delete('/api/v1/content-requests/:id', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const id = parsePositiveId((req.params as { id: string }).id);
    if (!id) return reply.code(400).send({ error: 'Invalid content request ID' });

    const item = await repo.getContentRequestById(id);
    if (!item) return reply.code(404).send({ error: 'Content request not found' });

    if (!req.user?.isAdmin && item.authorNpm !== req.user?.npm) {
      return reply.code(403).send({ error: 'Forbidden: thread belongs to another member' });
    }

    await repo.deleteContentRequest(id);
    return { data: { id } };
  });

  fastify.post('/api/v1/content-requests/:id/messages', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const id = parsePositiveId((req.params as { id: string }).id);
    if (!id) return reply.code(400).send({ error: 'Invalid content request ID' });

    const item = await repo.getContentRequestById(id);
    if (!item) return reply.code(404).send({ error: 'Content request not found' });

    if (!req.user?.isAdmin && item.authorNpm !== req.user?.npm) {
      return reply.code(403).send({ error: 'Forbidden: thread belongs to another member' });
    }

    if (!req.user?.isAdmin && (item.status === 'resolved' || item.status === 'closed')) {
      return reply.code(400).send({ error: 'Thread is closed for new replies' });
    }

    const body = ContentRequestMessageCreateSchema.parse(req.body);
    const authorRole = req.user?.isAdmin ? 'admin' : 'user';
    const created = await repo.createContentRequestMessage(id, req.user!.npm!, authorRole, body);
    return reply.code(201).send({ data: created });
  });

  fastify.put(
    '/api/v1/content-requests/:id/messages/:messageId',
    { preHandler },
    async (req, reply) => {
      reply.header('Cache-Control', 'private, no-store');
      const params = req.params as { id: string; messageId: string };
      const id = parsePositiveId(params.id);
      const messageId = parsePositiveId(params.messageId);
      if (!id || !messageId) {
        return reply.code(400).send({ error: 'Invalid request or message ID' });
      }

      const item = await repo.getContentRequestById(id);
      if (!item) return reply.code(404).send({ error: 'Content request not found' });

      const message = await repo.getContentRequestMessageById(messageId);
      if (!message || message.requestId !== id) {
        return reply.code(404).send({ error: 'Message not found' });
      }

      if (!req.user?.isAdmin && message.authorNpm !== req.user?.npm) {
        return reply.code(403).send({ error: 'Forbidden: cannot edit another member message' });
      }

      const body = ContentRequestMessageUpdateSchema.parse(req.body);
      const updated = await repo.updateContentRequestMessage(id, messageId, body);
      if (!updated) return reply.code(404).send({ error: 'Message not found' });
      return { data: updated };
    },
  );

  fastify.delete(
    '/api/v1/content-requests/:id/messages/:messageId',
    { preHandler },
    async (req, reply) => {
      reply.header('Cache-Control', 'private, no-store');
      const params = req.params as { id: string; messageId: string };
      const id = parsePositiveId(params.id);
      const messageId = parsePositiveId(params.messageId);
      if (!id || !messageId) {
        return reply.code(400).send({ error: 'Invalid request or message ID' });
      }

      const item = await repo.getContentRequestById(id);
      if (!item) return reply.code(404).send({ error: 'Content request not found' });

      const message = await repo.getContentRequestMessageById(messageId);
      if (!message || message.requestId !== id) {
        return reply.code(404).send({ error: 'Message not found' });
      }

      if (!req.user?.isAdmin && message.authorNpm !== req.user?.npm) {
        return reply.code(403).send({ error: 'Forbidden: cannot delete another member message' });
      }

      await repo.deleteContentRequestMessage(id, messageId);
      return { data: { id: messageId } };
    },
  );
}
