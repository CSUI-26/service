import type { FastifyInstance } from 'fastify';
import { adminOnly, blockUnauthorized } from '../middleware/auth.js';
import * as repo from '../db/repository.js';
import { ActivityCreateSchema, ActivityUpdateSchema } from '../schemas/index.js';
import { parsePaging } from './courses.js';

export async function activityRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/activities', async (req, reply) => {
    const query = req.query as {
      search?: string;
      page?: string;
      limit?: string;
    };

    const isAuthedRequest = Boolean(req.headers.cookie || req.headers.authorization);
    reply.header('Vary', 'Cookie, Authorization');
    reply.header(
      'Cache-Control',
      isAuthedRequest ? 'private, no-store' : 'public, max-age=60, stale-while-revalidate=300',
    );

    if (!query.search && query.page === undefined && query.limit === undefined) {
      const results = await repo.getAllActivities();
      const total = results.length;
      return {
        data: results,
        total,
        page: 1,
        limit: Math.max(20, total),
        totalPages: 1,
      };
    }

    const { page, limit, offset } = parsePaging(query);
    const filters = { search: query.search };
    const [results, total] = await Promise.all([
      repo.getAllActivities({ ...filters, limit, offset }),
      repo.countActivities(filters),
    ]);

    return {
      data: results,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.get('/api/v1/activities/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const activity = await repo.getActivityById(id);
    if (!activity) return reply.code(404).send({ error: 'Activity not found' });

    const isAuthedRequest = Boolean(req.headers.cookie || req.headers.authorization);
    reply.header('Vary', 'Cookie, Authorization');
    reply.header(
      'Cache-Control',
      isAuthedRequest ? 'private, no-store' : 'public, max-age=60, stale-while-revalidate=300',
    );
    return { data: activity };
  });

  fastify.post(
    '/api/v1/activities',
    { preHandler: [blockUnauthorized(), adminOnly()] },
    async (req, reply) => {
      const body = ActivityCreateSchema.parse(req.body);
      const existing = await repo.getActivityById(body.id);
      if (existing) return reply.code(409).send({ error: 'Activity exists' });
      const created = await repo.createActivity(body);
      return reply.code(201).send({ data: created });
    },
  );

  fastify.put(
    '/api/v1/activities/:id',
    { preHandler: [blockUnauthorized(), adminOnly()] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = ActivityUpdateSchema.parse(req.body);
      const updated = await repo.updateActivity(id, body);
      if (!updated) return reply.code(404).send({ error: 'Activity not found' });
      return { data: updated };
    },
  );

  fastify.delete(
    '/api/v1/activities/:id',
    { preHandler: [blockUnauthorized(), adminOnly()] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const deleted = await repo.deleteActivity(id);
      if (!deleted) return reply.code(404).send({ error: 'Activity not found' });
      return { data: { id } };
    },
  );
}
