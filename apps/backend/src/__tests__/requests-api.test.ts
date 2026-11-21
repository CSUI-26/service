import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { signToken } from '../middleware/auth.js';

const WEBP_1X1 = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x11, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
  0x05, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x00,
]);

function buildMultipartBody(
  filename: string,
  contentType: string,
  content: Buffer,
  boundary = '----ZenithRequestsTestBoundary',
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

describe('Requests API integration', () => {
  let app: ReturnType<typeof createApp>;
  let prevS3Endpoint: string | undefined;
  let memberOne: { npm: string; name: string };
  let memberTwo: { npm: string; name: string };
  const adminToken = signToken({ nama: 'Admin', npm: '2606888572' });
  const createdThreadIds: number[] = [];

  beforeAll(async () => {
    prevS3Endpoint = process.env.S3_ENDPOINT;
    delete process.env.S3_ENDPOINT;
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
    for (const id of createdThreadIds) {
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/requests/${id}`,
        headers: { cookie: `token=${adminToken}` },
      });
    }
    if (prevS3Endpoint !== undefined) {
      process.env.S3_ENDPOINT = prevS3Endpoint;
    }
    await app.close();
  });

  it('rejects unauthenticated (401) and non-whitelisted (403) callers on /api/v1/requests and /api/v1/upload/request', async () => {
    const unauth = await app.inject({ method: 'GET', url: '/api/v1/requests' });
    expect(unauth.statusCode).toBe(401);

    const unknownToken = signToken({ nama: 'Stranger', npm: '9999999999' });
    const nonWhitelisted = await app.inject({
      method: 'GET',
      url: '/api/v1/requests',
      headers: { cookie: `token=${unknownToken}` },
    });
    expect(nonWhitelisted.statusCode).toBe(403);

    const uploadBody = buildMultipartBody('evidence.webp', 'image/webp', WEBP_1X1);
    const nonWhitelistedUpload = await app.inject({
      method: 'POST',
      url: '/api/v1/upload/request',
      headers: { cookie: `token=${unknownToken}`, 'content-type': uploadBody.contentType },
      payload: uploadBody.payload,
    });
    expect(nonWhitelistedUpload.statusCode).toBe(403);
  });

  it('enforces strict creator-and-admin privacy, full member edit/delete, status lifecycle, and closed-thread reply guard', async () => {
    const userOneToken = signToken({ nama: memberOne.name, npm: memberOne.npm });
    const userTwoToken = signToken({ nama: memberTwo.name, npm: memberTwo.npm });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/requests',
      headers: { cookie: `token=${userOneToken}` },
      payload: {
        category: 'content',
        title: 'Request prestasi Gemastik 2026',
        description: 'Mohon bantu tambahkan juara 2 kategori Keamanan Siber.',
        metadata: {
          contentType: 'achievement',
          year: 2026,
          teamName: 'ZenithSec',
        },
      },
    });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.headers['cache-control']).toBe('private, no-store');

    const threadId: number = createRes.json().data.id;
    createdThreadIds.push(threadId);
    expect(createRes.json().data.authorNpm).toBe(memberOne.npm);
    expect(createRes.json().data.status).toBe('open');
    expect(createRes.json().data.author?.npm).toBe(memberOne.npm);

    // Second member cannot see or access memberOne's private thread
    const listTwo = await app.inject({
      method: 'GET',
      url: '/api/v1/requests',
      headers: { cookie: `token=${userTwoToken}` },
    });
    expect(listTwo.statusCode).toBe(200);
    expect((listTwo.json().data as Array<{ id: number }>).some((t) => t.id === threadId)).toBe(false);

    const getByTwo = await app.inject({
      method: 'GET',
      url: `/api/v1/requests/${threadId}`,
      headers: { cookie: `token=${userTwoToken}` },
    });
    expect(getByTwo.statusCode).toBe(403);

    const replyByTwo = await app.inject({
      method: 'POST',
      url: `/api/v1/requests/${threadId}/messages`,
      headers: { cookie: `token=${userTwoToken}` },
      payload: { body: 'Intrusions should fail' },
    });
    expect(replyByTwo.statusCode).toBe(403);

    // MemberOne posts and edits their own message
    const msgRes = await app.inject({
      method: 'POST',
      url: `/api/v1/requests/${threadId}/messages`,
      headers: { cookie: `token=${userOneToken}` },
      payload: { body: 'Draft pesan awal' },
    });
    expect(msgRes.statusCode).toBe(201);
    const messageId: number = msgRes.json().data.id;

    const editMsgRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/requests/${threadId}/messages/${messageId}`,
      headers: { cookie: `token=${userOneToken}` },
      payload: { body: 'Pesan sudah diperbaiki' },
    });
    expect(editMsgRes.statusCode).toBe(200);
    expect(editMsgRes.json().data.body).toBe('Pesan sudah diperbaiki');

    // Member cannot set status to 'resolved', only 'closed'
    const badStatusRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/requests/${threadId}`,
      headers: { cookie: `token=${userOneToken}` },
      payload: { status: 'resolved' },
    });
    expect(badStatusRes.statusCode).toBe(403);

    // Admin transitions thread to 'resolved' and replies
    const adminResolve = await app.inject({
      method: 'PUT',
      url: `/api/v1/requests/${threadId}`,
      headers: { cookie: `token=${adminToken}` },
      payload: { status: 'resolved' },
    });
    expect(adminResolve.statusCode).toBe(200);
    expect(adminResolve.json().data.status).toBe('resolved');

    const adminReply = await app.inject({
      method: 'POST',
      url: `/api/v1/requests/${threadId}/messages`,
      headers: { cookie: `token=${adminToken}` },
      payload: { body: 'Sudah kami proses dan tayangkan ya!' },
    });
    expect(adminReply.statusCode).toBe(201);
    expect(adminReply.json().data.authorRole).toBe('admin');

    // Member cannot post new reply once resolved
    const blockedReply = await app.inject({
      method: 'POST',
      url: `/api/v1/requests/${threadId}/messages`,
      headers: { cookie: `token=${userOneToken}` },
      payload: { body: 'Coba balas lagi' },
    });
    expect(blockedReply.statusCode).toBe(400);

    // Member retains edit & delete permissions on own messages and thread at any time
    const editAfterResolved = await app.inject({
      method: 'PUT',
      url: `/api/v1/requests/${threadId}/messages/${messageId}`,
      headers: { cookie: `token=${userOneToken}` },
      payload: { body: 'Pesan tetap bisa diedit' },
    });
    expect(editAfterResolved.statusCode).toBe(200);

    const deleteMsg = await app.inject({
      method: 'DELETE',
      url: `/api/v1/requests/${threadId}/messages/${messageId}`,
      headers: { cookie: `token=${userOneToken}` },
    });
    expect(deleteMsg.statusCode).toBe(200);

    const deleteThread = await app.inject({
      method: 'DELETE',
      url: `/api/v1/requests/${threadId}`,
      headers: { cookie: `token=${userOneToken}` },
    });
    expect(deleteThread.statusCode).toBe(200);
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
