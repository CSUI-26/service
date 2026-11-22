import type { FastifyInstance } from 'fastify';
import { adminOnly, blockUnauthorized } from '../middleware/auth.js';
import * as repo from '../db/repository.js';

export async function adminStatsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/api/v1/admin/stats',
    { preHandler: [blockUnauthorized(), adminOnly()] },
    async (_req, reply) => {
      reply.header('Cache-Control', 'private, no-store');
      const stats = await repo.getAdminStats();
      return { data: stats };
    },
  );
}
