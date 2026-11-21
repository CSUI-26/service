import type { FastifyInstance } from 'fastify';
import { adminOnly, blockUnauthorized } from '../middleware/auth.js';
import * as repo from '../db/repository.js';
import {
  GalleryCategorySchema,
  GalleryItemCreateSchema,
  GalleryItemUpdateSchema,
} from '../schemas/index.js';
import { parsePaging } from './courses.js';

export async function galleryRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/gallery', async (req, reply) => {
    const query = req.query as {
      format?: string;
      search?: string;
      category?: string;
      featured?: string;
      page?: string;
      limit?: string;
    };

    const isAuthedRequest = Boolean(req.headers.cookie || req.headers.authorization);
    reply.header('Vary', 'Cookie, Authorization');
    reply.header(
      'Cache-Control',
      isAuthedRequest ? 'private, no-store' : 'public, max-age=60, stale-while-revalidate=300',
    );

    if (query.format === 'grouped') {
      return { data: await repo.getGroupedGallery() };
    }

    const { page, limit, offset } = parsePaging(query);
    const parsedCategory =
      query.category !== undefined && query.category !== ''
        ? GalleryCategorySchema.safeParse(query.category)
        : null;
    const isFeatured =
      query.featured === 'true' ? true : query.featured === 'false' ? false : undefined;

    const filters = {
      search: query.search,
      category: parsedCategory?.success ? parsedCategory.data : undefined,
      isFeatured,
    };

    const [results, total] = await Promise.all([
      repo.getAllGalleryItems({ ...filters, limit, offset }),
      repo.countGalleryItems(filters),
    ]);

    return {
      data: results,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  });

  fastify.get('/api/v1/gallery/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const item = await repo.getGalleryItemById(id);
    if (!item) return reply.code(404).send({ error: 'Gallery item not found' });

    const isAuthedRequest = Boolean(req.headers.cookie || req.headers.authorization);
    reply.header('Vary', 'Cookie, Authorization');
    reply.header(
      'Cache-Control',
      isAuthedRequest ? 'private, no-store' : 'public, max-age=60, stale-while-revalidate=300',
    );
    return { data: item };
  });

  fastify.post(
    '/api/v1/gallery',
    { preHandler: [blockUnauthorized(), adminOnly()] },
    async (req, reply) => {
      const body = GalleryItemCreateSchema.parse(req.body);
      const existing = await repo.getGalleryItemById(body.id);
      if (existing) return reply.code(409).send({ error: 'Gallery item exists' });
      const created = await repo.createGalleryItem(body);
      return reply.code(201).send({ data: created });
    },
  );

  fastify.put(
    '/api/v1/gallery/:id',
    { preHandler: [blockUnauthorized(), adminOnly()] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = GalleryItemUpdateSchema.parse(req.body);
      const updated = await repo.updateGalleryItem(id, body);
      if (!updated) return reply.code(404).send({ error: 'Gallery item not found' });
      return { data: updated };
    },
  );

  fastify.delete(
    '/api/v1/gallery/:id',
    { preHandler: [blockUnauthorized(), adminOnly()] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const deleted = await repo.deleteGalleryItem(id);
      if (!deleted) return reply.code(404).send({ error: 'Gallery item not found' });
      return { data: { id } };
    },
  );
}
