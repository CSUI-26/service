import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AdminStatsSchema } from '@zenith/shared';
import { createApp } from '../app.js';
import { signToken } from '../middleware/auth.js';
import { ensureTestMembers } from './helpers/test-members.js';

const WEBP_1X1 = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x11, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
  0x05, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x00,
]);

function buildMultipartBody(
  filename: string,
  contentType: string,
  content: Buffer,
  boundary = '----ZenithSplitRequestsBoundary',
) {
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    payload: Buffer.concat([header, content, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describe('Split Content Requests, Feedback & Admin Stats API integration', () => {
  let app: ReturnType<typeof createApp>;
  let prevS3Endpoint: string | undefined;
  let memberOne: { npm: string; name: string };
  let memberTwo: { npm: string; name: string };
  const adminToken = signToken({ nama: 'Admin', npm: '2606888572' });
  const createdContentIds: number[] = [];
  const createdFeedbackIds: number[] = [];

  beforeAll(async () => {
    prevS3Endpoint = process.env.S3_ENDPOINT;
    delete process.env.S3_ENDPOINT;
    await ensureTestMembers();
    app = createApp();
    await app.ready();

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/members?limit=10',
      headers: { cookie: `token=${adminToken}` },
    });
    const nonAdmins = (listRes.json().data as Array<{ npm: string; name: string; role?: string }>).filter(
      (m) => m.npm !== '2606888572' && m.role !== 'admin',
    );
    memberOne = nonAdmins[0];
    memberTwo = nonAdmins[1];
  });

  afterAll(async () => {
    for (const id of createdContentIds) {
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/content-requests/${id}`,
        headers: { cookie: `token=${adminToken}` },
      });
    }
    for (const id of createdFeedbackIds) {
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/feedback/${id}`,
        headers: { cookie: `token=${adminToken}` },
      });
    }
    if (prevS3Endpoint !== undefined) {
      process.env.S3_ENDPOINT = prevS3Endpoint;
    }
    await app.close();
  });

  it('rejects unauthenticated (401) and non-whitelisted (403) callers across split endpoints', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/content-requests' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/v1/feedback' })).statusCode).toBe(401);

    const unknownToken = signToken({ nama: 'Stranger', npm: '9999999999' });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/content-requests',
          headers: { cookie: `token=${unknownToken}` },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/feedback',
          headers: { cookie: `token=${unknownToken}` },
        })
      ).statusCode,
    ).toBe(403);

    const uploadBody = buildMultipartBody('evidence.webp', 'image/webp', WEBP_1X1);
    const nonWhitelistedUpload = await app.inject({
      method: 'POST',
      url: '/api/v1/upload/request',
      headers: { cookie: `token=${unknownToken}`, 'content-type': uploadBody.contentType },
      payload: uploadBody.payload,
    });
    expect(nonWhitelistedUpload.statusCode).toBe(403);
  });

  it('supports content request CRUD, privacy isolation, and message lifecycle on /api/v1/content-requests', async () => {
    const userOneToken = signToken({ nama: memberOne.name, npm: memberOne.npm });
    const userTwoToken = signToken({ nama: memberTwo.name, npm: memberTwo.npm });

    const achievementRes = await app.inject({
      method: 'POST',
      url: '/api/v1/content-requests',
      headers: { cookie: `token=${userOneToken}` },
      payload: {
        contentType: 'achievement',
        title: 'Juara 2 Gemastik 2026',
        description: 'Tim ZenithSec meraih juara 2. Drive: https://drive.google.com/example',
      },
    });
    expect(achievementRes.statusCode).toBe(201);
    expect(achievementRes.headers['cache-control']).toBe('private, no-store');
    const achievementId: number = achievementRes.json().data.id;
    createdContentIds.push(achievementId);
    expect(achievementRes.json().data.contentType).toBe('achievement');
    expect(achievementRes.json().data).not.toHaveProperty('metadata');

    const galleryRes = await app.inject({
      method: 'POST',
      url: '/api/v1/content-requests',
      headers: { cookie: `token=${userOneToken}` },
      payload: {
        contentType: 'gallery',
        title: 'Foto Makrab Zenith',
        description: 'Dokumentasi kegiatan makrab: https://drive.google.com/gallery-folder',
      },
    });
    expect(galleryRes.statusCode).toBe(201);
    const galleryId: number = galleryRes.json().data.id;
    createdContentIds.push(galleryId);
    expect(galleryRes.json().data.contentType).toBe('gallery');

    // Privacy isolation for memberTwo
    const listTwo = await app.inject({
      method: 'GET',
      url: '/api/v1/content-requests',
      headers: { cookie: `token=${userTwoToken}` },
    });
    expect(listTwo.statusCode).toBe(200);
    expect((listTwo.json().data as Array<{ id: number }>).some((t) => t.id === achievementId)).toBe(false);

    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/v1/content-requests/${achievementId}`,
          headers: { cookie: `token=${userTwoToken}` },
        })
      ).statusCode,
    ).toBe(403);

    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/content-requests/${achievementId}/messages`,
          headers: { cookie: `token=${userTwoToken}` },
          payload: { body: 'Unauthorized reply' },
        })
      ).statusCode,
    ).toBe(403);

    // MemberOne replies and edits message
    const msgRes = await app.inject({
      method: 'POST',
      url: `/api/v1/content-requests/${achievementId}/messages`,
      headers: { cookie: `token=${userOneToken}` },
      payload: { body: 'Draft pesan awal' },
    });
    expect(msgRes.statusCode).toBe(201);
    const messageId: number = msgRes.json().data.id;

    const editMsgRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/content-requests/${achievementId}/messages/${messageId}`,
      headers: { cookie: `token=${userOneToken}` },
      payload: { body: 'Pesan diperbarui' },
    });
    expect(editMsgRes.statusCode).toBe(200);
    expect(editMsgRes.json().data.body).toBe('Pesan diperbarui');

    // Member cannot set status to resolved
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/v1/content-requests/${achievementId}`,
          headers: { cookie: `token=${userOneToken}` },
          payload: { status: 'resolved' },
        })
      ).statusCode,
    ).toBe(403);

    // Admin resolves and replies
    const adminResolve = await app.inject({
      method: 'PUT',
      url: `/api/v1/content-requests/${achievementId}`,
      headers: { cookie: `token=${adminToken}` },
      payload: { status: 'resolved' },
    });
    expect(adminResolve.statusCode).toBe(200);
    expect(adminResolve.json().data.status).toBe('resolved');

    const adminReply = await app.inject({
      method: 'POST',
      url: `/api/v1/content-requests/${achievementId}/messages`,
      headers: { cookie: `token=${adminToken}` },
      payload: { body: 'Sudah kami terbitkan.' },
    });
    expect(adminReply.statusCode).toBe(201);
    expect(adminReply.json().data.authorRole).toBe('admin');

    // Member reply blocked once resolved
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/content-requests/${achievementId}/messages`,
          headers: { cookie: `token=${userOneToken}` },
          payload: { body: 'Balasan setelah selesai' },
        })
      ).statusCode,
    ).toBe(400);

    // Member retains delete permission on own message & thread
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/api/v1/content-requests/${achievementId}/messages/${messageId}`,
          headers: { cookie: `token=${userOneToken}` },
        })
      ).statusCode,
    ).toBe(200);

    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/api/v1/content-requests/${achievementId}`,
          headers: { cookie: `token=${userOneToken}` },
        })
      ).statusCode,
    ).toBe(200);
  });

  it('supports feedback thread CRUD, privacy isolation, and message lifecycle on /api/v1/feedback', async () => {
    const userOneToken = signToken({ nama: memberOne.name, npm: memberOne.npm });
    const userTwoToken = signToken({ nama: memberTwo.name, npm: memberTwo.npm });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/feedback',
      headers: { cookie: `token=${userOneToken}` },
      payload: {
        category: 'help',
        title: 'Kendala login SSO',
        description: 'Mohon bantu cek akses NPM saya.',
        externalUrl: 'https://example.com/screenshot',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const threadId: number = createRes.json().data.id;
    createdFeedbackIds.push(threadId);
    expect(createRes.json().data.externalUrl).toBe('https://example.com/screenshot');

    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/v1/feedback/${threadId}`,
          headers: { cookie: `token=${userTwoToken}` },
        })
      ).statusCode,
    ).toBe(403);

    const msgRes = await app.inject({
      method: 'POST',
      url: `/api/v1/feedback/${threadId}/messages`,
      headers: { cookie: `token=${userOneToken}` },
      payload: { body: 'Detail tambahan' },
    });
    expect(msgRes.statusCode).toBe(201);
    const messageId: number = msgRes.json().data.id;

    const adminProgress = await app.inject({
      method: 'PUT',
      url: `/api/v1/feedback/${threadId}`,
      headers: { cookie: `token=${adminToken}` },
      payload: { status: 'in_progress' },
    });
    expect(adminProgress.statusCode).toBe(200);
    expect(adminProgress.json().data.status).toBe('in_progress');

    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/api/v1/feedback/${threadId}/messages/${messageId}`,
          headers: { cookie: `token=${userOneToken}` },
        })
      ).statusCode,
    ).toBe(200);

    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/api/v1/feedback/${threadId}`,
          headers: { cookie: `token=${userOneToken}` },
        })
      ).statusCode,
    ).toBe(200);
  });

  it('guards GET /api/v1/admin/stats for admins only and counts open threads accurately', async () => {
    const userOneToken = signToken({ nama: memberOne.name, npm: memberOne.npm });

    expect((await app.inject({ method: 'GET', url: '/api/v1/admin/stats' })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/admin/stats',
          headers: { cookie: `token=${userOneToken}` },
        })
      ).statusCode,
    ).toBe(403);

    const beforeRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/stats',
      headers: { cookie: `token=${adminToken}` },
    });
    expect(beforeRes.statusCode).toBe(200);
    const before = AdminStatsSchema.parse(beforeRes.json().data);

    const contentRes = await app.inject({
      method: 'POST',
      url: '/api/v1/content-requests',
      headers: { cookie: `token=${userOneToken}` },
      payload: {
        contentType: 'activity',
        title: 'Stats test activity',
        description: 'Testing openContentRequests count.',
      },
    });
    const contentId: number = contentRes.json().data.id;
    createdContentIds.push(contentId);

    const feedbackRes = await app.inject({
      method: 'POST',
      url: '/api/v1/feedback',
      headers: { cookie: `token=${userOneToken}` },
      payload: {
        category: 'feedback',
        title: 'Stats test feedback',
        description: 'Testing openFeedbackThreads count.',
      },
    });
    const feedbackId: number = feedbackRes.json().data.id;
    createdFeedbackIds.push(feedbackId);

    const afterRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/stats',
      headers: { cookie: `token=${adminToken}` },
    });
    expect(afterRes.statusCode).toBe(200);
    const after = AdminStatsSchema.parse(afterRes.json().data);

    expect(after.openContentRequests).toBe(before.openContentRequests + 1);
    expect(after.openFeedbackThreads).toBe(before.openFeedbackThreads + 1);
  });

  it('allows whitelisted members to upload request attachments via POST /api/v1/upload/request', async () => {
    const userToken = signToken({ nama: memberOne.name, npm: memberOne.npm });
    const body = buildMultipartBody('request.webp', 'image/webp', WEBP_1X1);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/upload/request',
      headers: { cookie: `token=${userToken}`, 'content-type': body.contentType },
      payload: body.payload,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.key.startsWith(`requests/${memberOne.npm}-`)).toBe(true);
  });
});
