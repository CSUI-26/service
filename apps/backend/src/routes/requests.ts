import type { FastifyInstance } from 'fastify';
import { blockUnauthorized, requireWhitelisted } from '../middleware/auth.js';
import * as repo from '../db/repository.js';
import {
  RequestCategorySchema,
  RequestMessageCreateSchema,
  RequestMessageUpdateSchema,
  RequestStatusSchema,
  RequestThreadCreateSchema,
  RequestThreadUpdateSchema,
} from '../schemas/index.js';
import { parsePaging } from './courses.js';

function parsePositiveId(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export async function requestRoutes(fastify: FastifyInstance) {
  const preHandler = [blockUnauthorized(), requireWhitelisted()];

  fastify.get('/api/v1/requests', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const query = req.query as {
      category?: string;
      status?: string;
      search?: string;
      scope?: string;
      page?: string;
      limit?: string;
    };

    const { page, limit } = parsePaging(query);
    const parsedCategory =
      query.category && query.category !== ''
        ? RequestCategorySchema.safeParse(query.category)
        : null;
    const parsedStatus =
      query.status && query.status !== ''
        ? RequestStatusSchema.safeParse(query.status)
        : null;

    const forceMine = !req.user?.isAdmin || query.scope === 'mine';

    return repo.getRequestThreads({
      authorNpm: forceMine ? req.user!.npm! : undefined,
      category: parsedCategory?.success ? parsedCategory.data : undefined,
      status: parsedStatus?.success ? parsedStatus.data : undefined,
      search: query.search?.trim() || undefined,
      page,
      limit,
    });
  });

  fastify.post('/api/v1/requests', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const body = RequestThreadCreateSchema.parse(req.body);
    const created = await repo.createRequestThread(req.user!.npm!, body);
    return reply.code(201).send({ data: created });
  });

  fastify.get('/api/v1/requests/:id', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const id = parsePositiveId((req.params as { id: string }).id);
    if (!id) return reply.code(400).send({ error: 'Invalid request thread ID' });

    const thread = await repo.getRequestThreadById(id);
    if (!thread) return reply.code(404).send({ error: 'Request thread not found' });

    if (!req.user?.isAdmin && thread.authorNpm !== req.user?.npm) {
      return reply.code(403).send({ error: 'Forbidden: thread belongs to another member' });
    }

    return { data: thread };
  });

  fastify.put('/api/v1/requests/:id', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const id = parsePositiveId((req.params as { id: string }).id);
    if (!id) return reply.code(400).send({ error: 'Invalid request thread ID' });

    const thread = await repo.getRequestThreadById(id);
    if (!thread) return reply.code(404).send({ error: 'Request thread not found' });

    if (!req.user?.isAdmin && thread.authorNpm !== req.user?.npm) {
      return reply.code(403).send({ error: 'Forbidden: thread belongs to another member' });
    }

    const body = RequestThreadUpdateSchema.parse(req.body);
    if (!req.user?.isAdmin && body.status !== undefined && body.status !== 'closed') {
      return reply.code(403).send({ error: 'Forbidden: members can only close their own threads' });
    }

    const updated = await repo.updateRequestThread(id, body);
    if (!updated) return reply.code(404).send({ error: 'Request thread not found' });
    return { data: updated };
  });

  fastify.delete('/api/v1/requests/:id', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const id = parsePositiveId((req.params as { id: string }).id);
    if (!id) return reply.code(400).send({ error: 'Invalid request thread ID' });

    const thread = await repo.getRequestThreadById(id);
    if (!thread) return reply.code(404).send({ error: 'Request thread not found' });

    if (!req.user?.isAdmin && thread.authorNpm !== req.user?.npm) {
      return reply.code(403).send({ error: 'Forbidden: thread belongs to another member' });
    }

    await repo.deleteRequestThread(id);
    return { data: { id } };
  });

  fastify.post('/api/v1/requests/:id/messages', { preHandler }, async (req, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const id = parsePositiveId((req.params as { id: string }).id);
    if (!id) return reply.code(400).send({ error: 'Invalid request thread ID' });

    const thread = await repo.getRequestThreadById(id);
    if (!thread) return reply.code(404).send({ error: 'Request thread not found' });

    if (!req.user?.isAdmin && thread.authorNpm !== req.user?.npm) {
      return reply.code(403).send({ error: 'Forbidden: thread belongs to another member' });
    }

    if (!req.user?.isAdmin && (thread.status === 'resolved' || thread.status === 'closed')) {
      return reply.code(400).send({ error: 'Thread is closed for new replies' });
    }

    const body = RequestMessageCreateSchema.parse(req.body);
    const authorRole = req.user?.isAdmin ? 'admin' : 'user';
    const created = await repo.createRequestMessage(id, req.user!.npm!, authorRole, body);
    return reply.code(201).send({ data: created });
  });

  fastify.put(
    '/api/v1/requests/:id/messages/:messageId',
    { preHandler },
    async (req, reply) => {
      reply.header('Cache-Control', 'private, no-store');
      const params = req.params as { id: string; messageId: string };
      const id = parsePositiveId(params.id);
      const messageId = parsePositiveId(params.messageId);
      if (!id || !messageId) {
        return reply.code(400).send({ error: 'Invalid thread or message ID' });
      }

      const thread = await repo.getRequestThreadById(id);
      if (!thread) return reply.code(404).send({ error: 'Request thread not found' });

      const message = await repo.getRequestMessageById(messageId);
      if (!message || message.threadId !== id) {
        return reply.code(404).send({ error: 'Message not found' });
      }

      if (!req.user?.isAdmin && message.authorNpm !== req.user?.npm) {
        return reply.code(403).send({ error: 'Forbidden: cannot edit another member message' });
      }

      const body = RequestMessageUpdateSchema.parse(req.body);
      const updated = await repo.updateRequestMessage(id, messageId, body);
      if (!updated) return reply.code(404).send({ error: 'Message not found' });
      return { data: updated };
    },
  );

  fastify.delete(
    '/api/v1/requests/:id/messages/:messageId',
    { preHandler },
    async (req, reply) => {
      reply.header('Cache-Control', 'private, no-store');
      const params = req.params as { id: string; messageId: string };
      const id = parsePositiveId(params.id);
      const messageId = parsePositiveId(params.messageId);
      if (!id || !messageId) {
        return reply.code(400).send({ error: 'Invalid thread or message ID' });
      }

      const thread = await repo.getRequestThreadById(id);
      if (!thread) return reply.code(404).send({ error: 'Request thread not found' });

      const message = await repo.getRequestMessageById(messageId);
      if (!message || message.threadId !== id) {
        return reply.code(404).send({ error: 'Message not found' });
      }

      if (!req.user?.isAdmin && message.authorNpm !== req.user?.npm) {
        return reply.code(403).send({ error: 'Forbidden: cannot delete another member message' });
      }

      await repo.deleteRequestMessage(id, messageId);
      return { data: { id: messageId } };
    },
  );
}
