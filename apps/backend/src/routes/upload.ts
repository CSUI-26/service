import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import multipart from '@fastify/multipart';
import { adminOnly, blockUnauthorized, requireWhitelisted } from '../middleware/auth.js';
import { parseImageHeader } from '../lib/image.js';
import { getObject, putObject } from '../services/storage.js';

async function handleImageUpload(
  req: FastifyRequest,
  reply: FastifyReply,
  buildKey: (ext: string) => string,
) {
  if (!req.isMultipart()) {
    return reply.code(400).send({ error: 'Multipart form-data required' });
  }
  const file = await req.file();
  if (!file) {
    return reply.code(400).send({ error: 'Image file is required' });
  }

  const buf = await file.toBuffer();
  const meta = parseImageHeader(buf);
  const key = buildKey(meta.ext);
  const rawOidcHeader = req.headers['x-vercel-oidc-token'];
  const oidcToken = Array.isArray(rawOidcHeader) ? rawOidcHeader[0] : rawOidcHeader;
  const stored = await putObject(key, buf, meta.mime, { oidcToken });

  return reply.send({
    data: {
      url: stored.url,
      key: stored.key,
      width: meta.width,
      height: meta.height,
      mime: meta.mime,
      size: meta.size,
    },
  });
}

export async function uploadRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: {
      fileSize: 2_621_440,
      files: 1,
    },
  });

  fastify.post(
    '/api/v1/upload/avatar',
    { preHandler: [blockUnauthorized(), requireWhitelisted()] },
    async (req, reply) => {
      const { npm } = req.query as { npm?: string };
      const callerNpm = req.user?.npm;
      const targetNpm = npm ? npm.trim() : callerNpm;

      if (!req.user?.isAdmin && targetNpm !== callerNpm) {
        return reply.code(403).send({ error: 'Forbidden: cannot upload avatar for another member' });
      }
      if (!targetNpm || !/^\d{10}$/.test(targetNpm)) {
        return reply.code(400).send({ error: 'Valid 10-digit NPM required' });
      }

      return handleImageUpload(req, reply, (ext) => `members/${randomUUID()}.${ext}`);
    },
  );

function sanitizeUploadSlug(rawId: string | undefined, fallback: string): string {
  return (
    (rawId || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}

  fastify.post(
    '/api/v1/upload/achievement',
    { preHandler: [blockUnauthorized(), adminOnly()] },
    async (req, reply) => {
      const { id, slug } = req.query as { id?: string; slug?: string };
      const safeId = sanitizeUploadSlug(id || slug, 'banner');

      return handleImageUpload(req, reply, (ext) => `achievements/${safeId}-${randomUUID()}.${ext}`);
    },
  );

  fastify.post(
    '/api/v1/upload/gallery',
    { preHandler: [blockUnauthorized(), adminOnly()] },
    async (req, reply) => {
      const { id } = req.query as { id?: string };
      const safeId = sanitizeUploadSlug(id, 'gallery');

      return handleImageUpload(req, reply, (ext) => `gallery/${safeId}-${Date.now()}.${ext}`);
    },
  );

  fastify.post(
    '/api/v1/upload/activity',
    { preHandler: [blockUnauthorized(), adminOnly()] },
    async (req, reply) => {
      const { id } = req.query as { id?: string };
      const safeId = sanitizeUploadSlug(id, 'activity');

      return handleImageUpload(req, reply, (ext) => `activities/${safeId}-${Date.now()}.${ext}`);
    },
  );

  fastify.post(
    '/api/v1/upload/request',
    { preHandler: [blockUnauthorized(), requireWhitelisted()] },
    async (req, reply) => {
      const callerNpm = req.user?.npm || 'member';

      return handleImageUpload(req, reply, (ext) => `requests/${callerNpm}-${randomUUID()}.${ext}`);
    },
  );

  fastify.get('/api/v1/media/*', async (req, reply) => {
    const rawKey = (req.params as { '*': string })['*'] || '';
    const key = rawKey.replace(/^\/+/, '');
    if (!key || key.includes('..') || !/^[a-zA-Z0-9/_.-]+$/.test(key)) {
      return reply.code(400).send({ error: 'Invalid media key' });
    }

    const rawOidcHeader = req.headers['x-vercel-oidc-token'];
    const oidcToken = Array.isArray(rawOidcHeader) ? rawOidcHeader[0] : rawOidcHeader;
    const obj = await getObject(key, { oidcToken });
    if (!obj) {
      return reply.code(404).send({ error: 'Media not found' });
    }

    return reply
      .header('Content-Type', obj.contentType)
      .header('Cache-Control', obj.cacheControl || 'public, max-age=31536000, immutable')
      .send(obj.body);
  });
}
