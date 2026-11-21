import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import {
  RequestCategorySchema,
  RequestContentTypeSchema,
  RequestMessageCreateSchema,
  RequestMessageUpdateSchema,
  RequestStatusSchema,
  RequestThreadCreateSchema,
  RequestThreadUpdateSchema,
} from '@zenith/shared';
import { requestMessages, requestThreads } from '../db/schema.js';

describe('Request Threads & Messages schemas', () => {
  it('validates RequestThreadCreateSchema defaults and metadata hints', () => {
    const parsed = RequestThreadCreateSchema.parse({
      title: 'Tambah prestasi Gemastik',
      description: 'Tim kami juara 2 Gemastik bidang Keamanan Siber.',
      metadata: {
        contentType: 'achievement',
        year: 2026,
        teamName: 'ZenithSec',
      },
    });
    expect(parsed.category).toBe('content');
    expect(parsed.metadata.contentType).toBe('achievement');
    expect(parsed.metadata.year).toBe(2026);

    expect(
      RequestThreadCreateSchema.safeParse({
        category: 'content',
        title: '   ',
        description: 'Valid description',
      }).success,
    ).toBe(false);

    expect(
      RequestThreadCreateSchema.safeParse({
        category: 'invalid_category',
        title: 'Valid title',
        description: 'Valid description',
      }).success,
    ).toBe(false);
  });

  it('validates RequestCategorySchema, RequestContentTypeSchema, RequestStatusSchema, and RequestThreadUpdateSchema', () => {
    expect(RequestCategorySchema.options).toEqual(['content', 'feedback', 'help', 'other']);
    expect(RequestContentTypeSchema.options).toEqual(['achievement', 'gallery', 'activity', 'other']);
    expect(RequestStatusSchema.options).toEqual(['open', 'in_progress', 'resolved', 'closed']);

    expect(RequestThreadUpdateSchema.parse({ status: 'in_progress', title: 'Updated' })).toEqual({
      status: 'in_progress',
      title: 'Updated',
    });
  });

  it('validates RequestMessageCreateSchema and RequestMessageUpdateSchema', () => {
    const msg = RequestMessageCreateSchema.parse({
      body: 'Ini link sertifikatnya ya kak.',
      image: { url: '/api/v1/media/requests/2606-cert.webp' },
    });
    expect(msg.body).toBe('Ini link sertifikatnya ya kak.');

    expect(RequestMessageUpdateSchema.safeParse({}).success).toBe(false);
    expect(
      RequestMessageUpdateSchema.safeParse({
        body: 'Edited message body',
      }).success,
    ).toBe(true);
    expect(
      RequestMessageUpdateSchema.safeParse({
        image: null,
      }).success,
    ).toBe(true);
  });

  it('defines request_threads and request_messages Drizzle table columns', () => {
    const threadCols = getTableColumns(requestThreads);
    expect(Object.keys(threadCols)).toEqual(
      expect.arrayContaining([
        'id',
        'authorNpm',
        'category',
        'title',
        'description',
        'status',
        'image',
        'metadata',
        'createdAt',
        'updatedAt',
      ]),
    );
    expect(threadCols.authorNpm.name).toBe('author_npm');
    expect(threadCols.createdAt.name).toBe('created_at');
    expect(threadCols.updatedAt.name).toBe('updated_at');

    const msgCols = getTableColumns(requestMessages);
    expect(Object.keys(msgCols)).toEqual(
      expect.arrayContaining([
        'id',
        'threadId',
        'authorNpm',
        'authorRole',
        'body',
        'image',
        'createdAt',
        'updatedAt',
      ]),
    );
    expect(msgCols.threadId.name).toBe('thread_id');
    expect(msgCols.authorNpm.name).toBe('author_npm');
    expect(msgCols.authorRole.name).toBe('author_role');
  });
});
