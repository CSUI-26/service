import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import {
  AdminStatsSchema,
  ContentRequestCreateSchema,
  ContentRequestTypeSchema,
  ContentRequestUpdateSchema,
  FeedbackCategorySchema,
  FeedbackThreadCreateSchema,
  FeedbackThreadUpdateSchema,
  MemberSchema,
} from '@zenith/shared';
import {
  contentRequestMessages,
  contentRequests,
  feedbackMessages,
  feedbackThreads,
  members,
} from '../db/schema.js';

const BASE_MEMBER = {
  npm: '2606888572',
  email: 'vicky@cs.ui.ac.id',
  name: 'Vicky Ibrahim',
  nama_panggilan: 'Vicky',
  programId: 'ilmu-komputer',
  instagram: '',
  line: '',
  github: '',
  linkedin: '',
  deskripsi: '',
  niche: '',
  quotes: '',
  foto: { url: '' },
};

describe('Member dateOfBirth & Split Request/Feedback schemas', () => {
  it('validates MemberSchema dateOfBirth formats and calendar invariants', () => {
    expect(MemberSchema.parse({ ...BASE_MEMBER, dateOfBirth: '2007-05-14' }).dateOfBirth).toBe(
      '2007-05-14',
    );
    expect(MemberSchema.parse({ ...BASE_MEMBER, dateOfBirth: null }).dateOfBirth).toBeNull();
    expect(MemberSchema.parse(BASE_MEMBER).dateOfBirth).toBeUndefined();

    expect(MemberSchema.safeParse({ ...BASE_MEMBER, dateOfBirth: '2026-02-31' }).success).toBe(
      false,
    );
    expect(MemberSchema.safeParse({ ...BASE_MEMBER, dateOfBirth: '14-05-2007' }).success).toBe(
      false,
    );
    expect(MemberSchema.safeParse({ ...BASE_MEMBER, dateOfBirth: '2999-01-01' }).success).toBe(
      false,
    );
  });

  it('validates ContentRequest schemas and defaults', () => {
    expect(ContentRequestTypeSchema.options).toEqual(['achievement', 'gallery', 'activity', 'other']);

    const created = ContentRequestCreateSchema.parse({
      title: 'Juara 2 Gemastik Keamanan Siber',
      description: 'Tim kami meraih juara 2 Gemastik. Link Drive: https://drive.google.com/demo',
    });
    expect(created.contentType).toBe('achievement');

    expect(
      ContentRequestCreateSchema.safeParse({
        contentType: 'gallery',
        title: '   ',
        description: 'Valid description',
      }).success,
    ).toBe(false);

    expect(
      ContentRequestUpdateSchema.parse({ status: 'in_progress', contentType: 'activity' }),
    ).toEqual({
      status: 'in_progress',
      contentType: 'activity',
    });
  });

  it('validates FeedbackThread schemas and AdminStatsSchema', () => {
    expect(FeedbackCategorySchema.options).toEqual(['feedback', 'help', 'other']);

    const created = FeedbackThreadCreateSchema.parse({
      title: 'Usul dark mode pada halaman kegiatan',
      description: 'Tambahkan kontras yang lebih nyaman dibaca.',
      externalUrl: 'https://example.com/ref',
    });
    expect(created.category).toBe('feedback');
    expect(created.externalUrl).toBe('https://example.com/ref');

    expect(
      FeedbackThreadCreateSchema.safeParse({
        category: 'content',
        title: 'Invalid category',
        description: 'Should fail',
      }).success,
    ).toBe(false);

    expect(
      FeedbackThreadUpdateSchema.parse({ status: 'resolved', externalUrl: null }),
    ).toEqual({
      status: 'resolved',
      externalUrl: null,
    });

    expect(
      AdminStatsSchema.parse({
        programs: 2,
        courses: 10,
        members: 120,
        achievements: 15,
        galleryItems: 24,
        activities: 8,
        openContentRequests: 3,
        openFeedbackThreads: 1,
      }),
    ).toMatchObject({ programs: 2, openContentRequests: 3, openFeedbackThreads: 1 });
  });

  it('defines members.dateOfBirth and split Drizzle table columns', () => {
    const memberCols = getTableColumns(members);
    expect(memberCols.dateOfBirth.name).toBe('date_of_birth');

    const contentCols = getTableColumns(contentRequests);
    expect(Object.keys(contentCols)).toEqual(
      expect.arrayContaining([
        'id',
        'authorNpm',
        'contentType',
        'title',
        'description',
        'status',
        'image',
        'createdAt',
        'updatedAt',
      ]),
    );
    expect(contentCols).not.toHaveProperty('metadata');
    expect(contentCols.contentType.name).toBe('content_type');

    const contentMsgCols = getTableColumns(contentRequestMessages);
    expect(contentMsgCols.requestId.name).toBe('request_id');
    expect(contentMsgCols.authorNpm.name).toBe('author_npm');

    const feedbackCols = getTableColumns(feedbackThreads);
    expect(Object.keys(feedbackCols)).toEqual(
      expect.arrayContaining([
        'id',
        'authorNpm',
        'category',
        'title',
        'description',
        'status',
        'image',
        'externalUrl',
        'createdAt',
        'updatedAt',
      ]),
    );
    expect(feedbackCols.externalUrl.name).toBe('external_url');

    const feedbackMsgCols = getTableColumns(feedbackMessages);
    expect(feedbackMsgCols.threadId.name).toBe('thread_id');
    expect(feedbackMsgCols.authorNpm.name).toBe('author_npm');
  });
});
