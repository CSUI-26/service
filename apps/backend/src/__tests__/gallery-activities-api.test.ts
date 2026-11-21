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
  boundary = '----ZenithGalleryTestBoundary',
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

describe('Gallery & Activities API integration', () => {
  let app: ReturnType<typeof createApp>;
  let prevS3Endpoint: string | undefined;
  let memberOne: { npm: string; name: string };
  const adminToken = signToken({ nama: 'Admin', npm: '2606888572' });
  const createdGalleryIds: string[] = [];
  const createdActivityIds: string[] = [];

  beforeAll(async () => {
    prevS3Endpoint = process.env.S3_ENDPOINT;
    delete process.env.S3_ENDPOINT;
    app = createApp();
    await app.ready();

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/members?limit=5',
      headers: { cookie: `token=${adminToken}` },
    });
    const nonAdmins = (listRes.json().data as Array<{ npm: string; name: string; role?: string }>).filter(
      (m) => m.npm !== '2606888572' && m.role !== 'admin',
    );
    memberOne = nonAdmins[0];
  });

  afterAll(async () => {
    for (const id of createdGalleryIds) {
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/gallery/${id}`,
        headers: { cookie: `token=${adminToken}` },
      });
    }
    for (const id of createdActivityIds) {
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/activities/${id}`,
        headers: { cookie: `token=${adminToken}` },
      });
    }
    if (prevS3Endpoint !== undefined) {
      process.env.S3_ENDPOINT = prevS3Endpoint;
    }
    await app.close();
  });

  it('allows public GET /api/v1/gallery, ?format=grouped, and GET /api/v1/activities with auth-aware caching', async () => {
    const galleryRes = await app.inject({ method: 'GET', url: '/api/v1/gallery' });
    expect(galleryRes.statusCode).toBe(200);
    expect(Array.isArray(galleryRes.json().data)).toBe(true);
    expect(galleryRes.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300');

    const groupedRes = await app.inject({ method: 'GET', url: '/api/v1/gallery?format=grouped' });
    expect(groupedRes.statusCode).toBe(200);
    expect(groupedRes.json().data).toHaveProperty('photos');
    expect(groupedRes.json().data).toHaveProperty('heroes');
    expect(groupedRes.json().data).toHaveProperty('highlights');
    expect(groupedRes.json().data).toHaveProperty('featuredPhoto');

    const authedActivitiesRes = await app.inject({
      method: 'GET',
      url: '/api/v1/activities',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(authedActivitiesRes.statusCode).toBe(200);
    expect(Array.isArray(authedActivitiesRes.json().data)).toBe(true);
    expect(authedActivitiesRes.headers['cache-control']).toBe('private, no-store');
  });

  it('enforces 401/403 RBAC and full CRUD lifecycle on /api/v1/gallery', async () => {
    const payload = {
      id: 'test-gallery-photo-1',
      title: 'Test Photo 1',
      alt: 'Test alt text',
      category: 'photo',
      isFeatured: true,
      image: {
        url: 'https://cdn.csui.dev/gallery/test-1.webp',
        config: { x: 50, y: 50, zoom: 1, aspect: '16:9' },
      },
      position: 0,
    };

    const unauth = await app.inject({ method: 'POST', url: '/api/v1/gallery', payload });
    expect(unauth.statusCode).toBe(401);

    const userToken = signToken({ nama: memberOne.name, npm: memberOne.npm });
    const nonAdmin = await app.inject({
      method: 'POST',
      url: '/api/v1/gallery',
      headers: { cookie: `token=${userToken}` },
      payload,
    });
    expect(nonAdmin.statusCode).toBe(403);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/gallery',
      headers: { cookie: `token=${adminToken}` },
      payload,
    });
    expect(createRes.statusCode).toBe(201);
    createdGalleryIds.push(payload.id);
    expect(createRes.json().data.id).toBe(payload.id);

    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/gallery',
      headers: { cookie: `token=${adminToken}` },
      payload,
    });
    expect(dupRes.statusCode).toBe(409);

    const groupedAfterCreate = await app.inject({ method: 'GET', url: '/api/v1/gallery?format=grouped' });
    expect(groupedAfterCreate.json().data.featuredPhoto?.id).toBe(payload.id);

    const putRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/gallery/${payload.id}`,
      headers: { cookie: `token=${adminToken}` },
      payload: { title: 'Updated Photo Title', isFeatured: false },
    });
    expect(putRes.statusCode).toBe(200);
    expect(putRes.json().data.title).toBe('Updated Photo Title');
    expect(putRes.json().data.isFeatured).toBe(false);

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/gallery/${payload.id}`,
      headers: { cookie: `token=${adminToken}` },
    });
    expect(delRes.statusCode).toBe(200);

    const afterDelete = await app.inject({ method: 'GET', url: `/api/v1/gallery/${payload.id}` });
    expect(afterDelete.statusCode).toBe(404);
  });

  it('enforces 401/403 RBAC and full CRUD lifecycle on /api/v1/activities', async () => {
    const payload = {
      id: 'test-activity-psaf',
      title: 'Test PSAF',
      date: '11-13 Agustus 2026',
      description: 'Pengenalan kuliah di Fasilkom.',
      image: {
        url: 'https://cdn.csui.dev/activities/test-psaf.webp',
        config: { x: 50, y: 50, zoom: 1, aspect: '16:9' },
      },
      position: 0,
    };

    const unauth = await app.inject({ method: 'POST', url: '/api/v1/activities', payload });
    expect(unauth.statusCode).toBe(401);

    const userToken = signToken({ nama: memberOne.name, npm: memberOne.npm });
    const nonAdmin = await app.inject({
      method: 'POST',
      url: '/api/v1/activities',
      headers: { cookie: `token=${userToken}` },
      payload,
    });
    expect(nonAdmin.statusCode).toBe(403);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/activities',
      headers: { cookie: `token=${adminToken}` },
      payload,
    });
    expect(createRes.statusCode).toBe(201);
    createdActivityIds.push(payload.id);

    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/activities',
      headers: { cookie: `token=${adminToken}` },
      payload,
    });
    expect(dupRes.statusCode).toBe(409);

    const putRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/activities/${payload.id}`,
      headers: { cookie: `token=${adminToken}` },
      payload: { title: 'Updated PSAF' },
    });
    expect(putRes.statusCode).toBe(200);
    expect(putRes.json().data.title).toBe('Updated PSAF');

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/activities/${payload.id}`,
      headers: { cookie: `token=${adminToken}` },
    });
    expect(delRes.statusCode).toBe(200);

    const afterDelete = await app.inject({ method: 'GET', url: `/api/v1/activities/${payload.id}` });
    expect(afterDelete.statusCode).toBe(404);
  });

  it('enforces admin-only RBAC on POST /api/v1/upload/gallery and /api/v1/upload/activity', async () => {
    const userToken = signToken({ nama: memberOne.name, npm: memberOne.npm });

    for (const [endpoint, prefix] of [
      ['/api/v1/upload/gallery?id=Foto_Angkatan', 'gallery/foto_angkatan-'],
      ['/api/v1/upload/activity?id=PSAF_2026', 'activities/psaf_2026-'],
    ] as const) {
      const unauthBody = buildMultipartBody('photo.webp', 'image/webp', WEBP_1X1);
      const unauthRes = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: { 'content-type': unauthBody.contentType },
        payload: unauthBody.payload,
      });
      expect(unauthRes.statusCode).toBe(401);

      const nonAdminBody = buildMultipartBody('photo.webp', 'image/webp', WEBP_1X1);
      const nonAdminRes = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: { cookie: `token=${userToken}`, 'content-type': nonAdminBody.contentType },
        payload: nonAdminBody.payload,
      });
      expect(nonAdminRes.statusCode).toBe(403);

      const adminBody = buildMultipartBody('photo.webp', 'image/webp', WEBP_1X1);
      const adminRes = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: { cookie: `token=${adminToken}`, 'content-type': adminBody.contentType },
        payload: adminBody.payload,
      });
      expect(adminRes.statusCode).toBe(200);
      expect(adminRes.json().data.key.startsWith(prefix)).toBe(true);
    }
  });
});
