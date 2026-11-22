# CSUI Zenith Service REST API Reference

> **Target Audience:** AI coding agents, frontend/website clients, and backend integrators.
> **Source of Truth:** [`packages/shared/src/index.ts`](file:///home/antigravity/VickyIbr/CSUI26/packages/shared/src/index.ts), [`apps/backend/src/app.ts`](file:///home/antigravity/VickyIbr/CSUI26/apps/backend/src/app.ts), and [`apps/backend/src/routes/`](file:///home/antigravity/VickyIbr/CSUI26/apps/backend/src/routes).

---

## 1. Quick Context for AI Agents

- **Base URL:** Same-origin `/api/v1` (e.g., `https://zenith.csui.dev/api/v1` or `http://localhost:3001/api/v1`). Health endpoints live at root (`/health`, `/healthz`).
- **Response Envelopes:**
  - Single resource / action: `{ "data": <T> }`
  - Paginated list: `{ "data": <T[]>, "total": number, "page": number, "limit": number, "totalPages": number }`
  - Error: `{ "error": string }` (Rate-limit `429`: `{ "statusCode": 429, "error": "Too Many Requests", "message": string }`)
- **Authentication:**
  - `httpOnly` cookie named `token` (set by `GET /api/v1/auth/callback`) **OR** `Authorization: Bearer <jwt>` header.
  - **Auth Tiers:**
    1. `Public`: No token required.
    2. `OptionalAuth`: Token optional. Unauthenticated or non-whitelisted callers receive redacted member payloads (`email`, `role`, and `dateOfBirth` stripped). Peer authenticated non-admins also have `dateOfBirth` stripped; self and admins receive `dateOfBirth`.
    3. `Whitelisted`: Valid JWT + `npm` exists in `members` PostgreSQL table (`401` if unauthenticated, `403` if not whitelisted).
    4. `Admin`: Valid JWT + whitelisted + (`members.role === 'admin'` OR `npm` in `ADMIN_NPM_LIST`) (`401` / `403`).
- **Rate Limiting:** `100` requests per `1 minute` per IP (`429 Too Many Requests`).
- **Pagination Defaults (`parsePaging`):** `page` defaults to `1` (min `1`); `limit` defaults to `20` (clamped `1..100`).
- **Caching Rules:**
  - Public read endpoints (`programs`, `semesters`, `achievements`, `gallery`, `activities`) return `Vary: Cookie, Authorization` and:
    - Unauthenticated (`no Cookie/Authorization`): `Cache-Control: public, max-age=60, stale-while-revalidate=300`
    - Authenticated (`Cookie` or `Authorization` present): `Cache-Control: private, no-store`
  - Member, Content Request, Feedback, and Admin Stats endpoints always return `Cache-Control: private, no-store`.
  - Binary media endpoint (`GET /api/v1/media/*`) returns `Cache-Control: public, max-age=31536000, immutable`.

---

## 2. Endpoint Index

| Domain | Method & Path | Auth Tier | Purpose |
| --- | --- | --- | --- |
| Health | `GET /health` | `Public` | DB row counts (`programs`, `members`) |
| Health | `GET /healthz` | `Public` | Liveness check (`"ok"`) |
| Auth | `GET /api/v1/auth/login` | `Public` | Redirect to SSO UI CAS 2.0 login |
| Auth | `GET /api/v1/auth/callback` | `Public` | Validate CAS ticket, issue `token` cookie & session JSON |
| Auth | `GET /api/v1/auth/me` | `Whitelisted` (JWT) | Return current `AuthUser` session |
| Auth | `POST /api/v1/auth/logout` | `Public` | Clear `token` cookie & return SSO logout URL |
| Programs | `GET /api/v1/programs` | `Public` | List all programs with nested semesters & courses |
| Programs | `GET /api/v1/programs/:id` | `Public` | Get single program by ID |
| Programs | `GET /api/v1/semesters` | `Public` | List semesters (`?program=<id>` optional) |
| Programs | `POST /api/v1/programs` | `Admin` | Create program |
| Programs | `PUT /api/v1/programs/:id` | `Admin` | Update program |
| Programs | `DELETE /api/v1/programs/:id` | `Admin` | Delete program (`409` if members exist) |
| Courses | `GET /api/v1/courses` | `Public` | Search & paginate courses |
| Courses | `POST /api/v1/courses` | `Admin` | Create course inside program/semester |
| Courses | `PUT /api/v1/courses/:id` | `Admin` | Update or relocate course |
| Courses | `DELETE /api/v1/courses/:id` | `Admin` | Delete course & prune empty semester |
| Members | `GET /api/v1/members` | `OptionalAuth` | Search & paginate members (PII-redacted by viewer role) |
| Members | `GET /api/v1/members/:npm` | `OptionalAuth` | Get member by 10-digit NPM (PII-redacted by viewer role) |
| Members | `PUT /api/v1/members/me` | `Whitelisted` | Self-service profile update (`npm` & `role` locked) |
| Members | `PUT /api/v1/members/:npm/role` | `Admin` | Promote/demote member role (`403` on superadmins) |
| Members | `POST /api/v1/members` | `Admin` | Create member |
| Members | `PUT /api/v1/members/:npm` | `Admin` | Update member |
| Members | `DELETE /api/v1/members/:npm` | `Admin` | Delete member |
| Achievements | `GET /api/v1/achievements` | `Public` | List/filter achievements or `?format=grouped` |
| Achievements | `GET /api/v1/achievements/:id` | `Public` | Get achievement by slug ID |
| Achievements | `POST /api/v1/achievements` | `Admin` | Create achievement |
| Achievements | `PUT /api/v1/achievements/:id` | `Admin` | Update achievement |
| Achievements | `DELETE /api/v1/achievements/:id` | `Admin` | Delete achievement |
| Gallery | `GET /api/v1/gallery` | `Public` | List/filter gallery items or `?format=grouped` |
| Gallery | `GET /api/v1/gallery/:id` | `Public` | Get gallery item by slug ID |
| Gallery | `POST /api/v1/gallery` | `Admin` | Create gallery item |
| Gallery | `PUT /api/v1/gallery/:id` | `Admin` | Update gallery item |
| Gallery | `DELETE /api/v1/gallery/:id` | `Admin` | Delete gallery item |
| Activities | `GET /api/v1/activities` | `Public` | List/search activities |
| Activities | `GET /api/v1/activities/:id` | `Public` | Get activity by slug ID |
| Activities | `POST /api/v1/activities` | `Admin` | Create activity |
| Activities | `PUT /api/v1/activities/:id` | `Admin` | Update activity |
| Activities | `DELETE /api/v1/activities/:id` | `Admin` | Delete activity |
| Content Requests | `GET /api/v1/content-requests` | `Whitelisted` | List/search content request threads (`scope=mine` or all for admins) |
| Content Requests | `POST /api/v1/content-requests` | `Whitelisted` | Create a content request thread |
| Content Requests | `GET /api/v1/content-requests/:id` | `Whitelisted` | Get thread detail + messages (owner or admin) |
| Content Requests | `PUT /api/v1/content-requests/:id` | `Whitelisted` | Update thread (non-admins may only set `status: "closed"`) |
| Content Requests | `DELETE /api/v1/content-requests/:id` | `Whitelisted` | Delete thread (owner or admin) |
| Content Requests | `POST /api/v1/content-requests/:id/messages` | `Whitelisted` | Post reply message on a thread |
| Content Requests | `PUT /api/v1/content-requests/:id/messages/:messageId` | `Whitelisted` | Edit reply message (author or admin) |
| Content Requests | `DELETE /api/v1/content-requests/:id/messages/:messageId` | `Whitelisted` | Delete reply message (author or admin) |
| Feedback | `GET /api/v1/feedback` | `Whitelisted` | List/search feedback & help threads (`scope=mine` or all for admins) |
| Feedback | `POST /api/v1/feedback` | `Whitelisted` | Create a feedback/help thread |
| Feedback | `GET /api/v1/feedback/:id` | `Whitelisted` | Get feedback thread detail + messages (owner or admin) |
| Feedback | `PUT /api/v1/feedback/:id` | `Whitelisted` | Update thread (non-admins may only set `status: "closed"`) |
| Feedback | `DELETE /api/v1/feedback/:id` | `Whitelisted` | Delete thread (owner or admin) |
| Feedback | `POST /api/v1/feedback/:id/messages` | `Whitelisted` | Post reply message on a feedback thread |
| Feedback | `PUT /api/v1/feedback/:id/messages/:messageId` | `Whitelisted` | Edit feedback reply (author or admin) |
| Feedback | `DELETE /api/v1/feedback/:id/messages/:messageId` | `Whitelisted` | Delete feedback reply (author or admin) |
| Admin Stats | `GET /api/v1/admin/stats` | `Admin` | Aggregated counts across entities & open threads |
| Media | `POST /api/v1/upload/avatar` | `Whitelisted` | Upload member avatar (`?npm=` for admin override) |
| Media | `POST /api/v1/upload/achievement` | `Admin` | Upload achievement banner (`?id=<slug>`) |
| Media | `POST /api/v1/upload/gallery` | `Admin` | Upload gallery image (`?id=<slug>`) |
| Media | `POST /api/v1/upload/activity` | `Admin` | Upload activity image (`?id=<slug>`) |
| Media | `POST /api/v1/upload/request` | `Whitelisted` | Upload attachment image for requests or feedback |
| Media | `GET /api/v1/media/*` | `Public` | Stream stored S3 object |

---

## 3. Shared Data Contracts (`@zenith/shared`)

### `ImageConfig` & `ImageField`
```ts
type ImageConfig = {
  x: number;        // Horizontal focal point percentage (0..100)
  y: number;        // Vertical focal point percentage (0..100)
  zoom: number;     // Scale factor (e.g., 1..3)
  rotate?: number;  // Degrees (0..360)
  aspect: string;   // Aspect ratio string, e.g. "1:1", "4:3", "4:7", "16:9"
};

type ImageField = {
  url: string;      // Must start with http://, https://, or / (or "" when optional)
  config?: ImageConfig;
};
```

---

## 4. Health & Authentication

### `GET /health`
- **Auth:** `Public`
- **Response `200`:** `{ "status": "ok", "programs": number, "members": number }`

### `GET /healthz`
- **Auth:** `Public`
- **Response `200`:** `"ok"`

### `GET /api/v1/auth/login`
- **Auth:** `Public`
- **Response `302`:** Redirects to SSO UI CAS 2.0 login URL with resolved `service` callback URL.

### `GET /api/v1/auth/callback`
- **Auth:** `Public`
- **Query Params:** `ticket` (required, string)
- **Behavior:** Deduplicates in-flight/cached CAS ticket validation (60s TTL), checks `members` table for whitelist, syncs `ADMIN_NPM_LIST` superadmins to `'admin'`, and sets `httpOnly` cookie `token` (`maxAge: 7d`, `sameSite: 'lax'`, `secure: NODE_ENV === 'production'`).
- **Responses:**
  - `200 OK`: `{ "data": { "success": true, "redirect": "/", "user": AuthUser } }`
  - `400 Bad Request`: `{ "error": "Missing ticket" }`
  - `401 Unauthorized`: `{ "error": "Authentication failed" }`
  - `403 Forbidden`: `{ "error": "NPM not registered", "redirect": "/access-denied", "data": { "redirect": "/access-denied", "user": AuthUser } }`

### `GET /api/v1/auth/me`
- **Auth:** `Whitelisted` (valid JWT required)
- **Headers:** `Cache-Control: no-store, no-cache, must-revalidate`
- **Response `200`:** `{ "data": AuthUser }`

### `POST /api/v1/auth/logout`
- **Auth:** `Public`
- **Behavior:** Clears `token` cookie.
- **Response `200`:** `{ "data": { "logoutUrl": string } }`

---

## 5. Study Programs & Semesters

### `Program` DTO
```ts
type Program = {
  id: string;
  name: string;
  slug: string;
  description: string;
  careers: string[];
  courseMapUrl: string;
  driveUrl: string;
  semesters: Array<{
    semester: number | string;
    courses: Course[];
  }>;
};
```

### Endpoints
- **`GET /api/v1/programs`** (`Public`, 60s TTL cached): Returns `{ "data": Program[] }`.
- **`GET /api/v1/programs/:id`** (`Public`, 60s TTL cached): Returns `{ "data": Program }` or `404` `{ "error": "Program not found" }`.
- **`GET /api/v1/semesters`** (`Public`, 60s TTL cached): Optional query `?program=<programId>`. Returns `{ "data": SemesterWithProgram[] }`.
- **`POST /api/v1/programs`** (`Admin`): Body `ProgramCreateSchema` (`semesters` optional, defaults `[]`). Returns `201` `{ "data": Program }` or `409` `{ "error": "Program exists" }`.
- **`PUT /api/v1/programs/:id`** (`Admin`): Body `ProgramUpdateSchema` (`ProgramSchema.partial().omit({ id: true })`). Returns `200` `{ "data": Program }` or `404`.
- **`DELETE /api/v1/programs/:id`** (`Admin`): Returns `200` `{ "data": { "id": string } }`, `404` if missing, or `409` `{ "error": "Program has members" }` if members reference the program.

---

## 6. Courses

### `Course` DTO
```ts
type Course = {
  id?: number;
  name: string;
  code?: string;
  sks: number;              // Integer 1..6
  description?: string;
  prerequisites?: string[];
  materialUrl?: string;     // Valid URL or ""
};
```

### Endpoints
- **`GET /api/v1/courses`** (`Public`):
  - **Query Params:** `search`, `sks` (number), `program` (programId), `semester`, `page`, `limit`.
  - **Response `200`:** Paginated `{ "data": CourseRow[], "total", "page", "limit", "totalPages" }`.
- **`POST /api/v1/courses`** (`Admin`):
  - **Body:** `{ "programId": string, "semester": number | string, "course": Course }`
  - **Responses:** `201` `{ "data": CourseRow }`, `404` `{ "error": "Program not found" }`.
- **`PUT /api/v1/courses/:id`** (`Admin`):
  - **Body:** `CourseUpdateSchema` (`CourseSchema.partial()` + optional `programId`, `semester`). Relocating `programId`/`semester` runs inside a transaction and prunes emptied `semesters`.
  - **Responses:** `200` `{ "data": CourseRow }`, `404`.
- **`DELETE /api/v1/courses/:id`** (`Admin`):
  - **Behavior:** Deletes course inside a transaction and prunes empty parent semester.
  - **Responses:** `200` `{ "data": CourseRow }`, `404`.

---

## 7. Members

### `Member` DTO
```ts
type Member = {
  npm: string;            // 10 digits (/^\d{10}$/)
  email: string;          // Stripped for unauthenticated/non-whitelisted viewers
  name: string;
  nama_panggilan: string;
  major?: string;
  programId?: string;
  dateOfBirth?: string | null; // YYYY-MM-DD (not in future); exposed only to self and admins
  instagram: string;
  line: string;
  github: string;
  linkedin: string;
  deskripsi: string;
  niche: string;
  quotes: string;
  foto: ImageField;
  role?: 'user' | 'admin'; // Stripped for unauthenticated/non-whitelisted viewers
};
```

### Endpoints
- **`GET /api/v1/members`** (`OptionalAuth`):
  - **Query Params:** `search`, `major`, `niche`, `program`, `page`, `limit`.
  - **Response `200`:** Paginated `{ "data": Member[], "total", "page", "limit", "totalPages" }`. `email` and `role` are omitted unless caller has a valid whitelisted session; `dateOfBirth` is omitted unless the item belongs to the caller or caller is an admin.
- **`GET /api/v1/members/:npm`** (`OptionalAuth`):
  - **Response `200`:** `{ "data": Member }` (PII-filtered by viewer auth) or `404`.
- **`PUT /api/v1/members/me`** (`Whitelisted`):
  - **Body:** `MemberUpdateSchema.omit({ role: true })` (`npm` and `role` locked). Omitting `dateOfBirth` preserves the stored value; passing `null` clears it.
  - **Responses:** `200` `{ "data": Member }`, `404`, `409` `{ "error": "Email already in use" }`.
- **`PUT /api/v1/members/:npm/role`** (`Admin` + `Whitelisted`):
  - **Body:** `{ "role": "user" | "admin" }`
  - **Responses:** `200` `{ "data": Member }`, `400` `{ "error": "Invalid role" }`, `403` `{ "error": "Forbidden: superadmin role cannot be changed" }`, `404`.
- **`POST /api/v1/members`** (`Admin`):
  - **Body:** `MemberCreateSchema`. Returns `201` `{ "data": Member }` or `409` `{ "error": "Member exists" }`.
- **`PUT /api/v1/members/:npm`** (`Admin`):
  - **Body:** `MemberUpdateSchema`. Returns `200` `{ "data": Member }` or `404` or `409` on duplicate email.
- **`DELETE /api/v1/members/:npm`** (`Admin`):
  - **Response `200`:** `{ "data": { "npm": string } }` or `404`.

---

## 8. Achievements

### `Achievement` DTO
```ts
type Achievement = {
  id: string;
  title: string;
  award: string;
  year: number;          // 1990..2100
  isFeatured: boolean;   // If true, award, image.url, teamName, members (>=1), description are required
  image: ImageField;
  teamName: string;
  members: string[];
  description: string;
  showOverlay: boolean;
  position: number;
};
```

### Endpoints
- **`GET /api/v1/achievements`** (`Public`):
  - **Mode 1 (`?format=grouped`):** 60s TTL cached. Returns `{ "data": { "latestAchievements": LatestAchievement[], "yearlyAchievementsByYear": YearGroup[] } }`.
  - **Mode 2 (default):** Query `search`, `year`, `featured` (`'true' | 'false'`), `page`, `limit`. Returns paginated `{ "data": Achievement[], "total", "page", "limit", "totalPages" }`.
- **`GET /api/v1/achievements/:id`** (`Public`): Returns `{ "data": Achievement }` or `404`.
- **`POST /api/v1/achievements`** (`Admin`): Body `AchievementCreateSchema`. Returns `201` `{ "data": Achievement }` or `409` `{ "error": "Achievement exists" }`.
- **`PUT /api/v1/achievements/:id`** (`Admin`): Body `AchievementUpdateSchema` (validates featured requirements when merged `isFeatured` is `true`). Returns `200` `{ "data": Achievement }` or `404`.
- **`DELETE /api/v1/achievements/:id`** (`Admin`): Returns `200` `{ "data": { "id": string } }` or `404`.

---

## 9. Gallery

### `GalleryItem` DTO
```ts
type GalleryCategory = 'photo' | 'hero' | 'highlight';

type GalleryItem = {
  id: string;          // Unique slug, e.g. "foto-angkatan-1", "racoon-1"
  title: string;
  alt: string;
  category: GalleryCategory;
  isFeatured: boolean; // Marks wide featured banner on /gallery
  image: ImageField;   // image.url is required (non-empty)
  position: number;    // Non-negative integer sort order
};
```

### Endpoints
- **`GET /api/v1/gallery`** (`Public`):
  - **Mode 1 (`?format=grouped`):** 60s TTL cached. Returns:
    ```json
    {
      "data": {
        "photos": [],
        "heroes": [],
        "highlights": [],
        "featuredPhoto": null
      }
    }
    ```
    `featuredPhoto` resolves to the first `photo` with `isFeatured: true` (`position ASC, id ASC`), falling back to the last `photo` item if none is marked featured.
  - **Mode 2 (default):** Query `search`, `category` (`photo | hero | highlight`), `featured` (`true | false`), `page`, `limit`. Returns paginated `{ "data": GalleryItem[], "total", "page", "limit", "totalPages" }`.
- **`GET /api/v1/gallery/:id`** (`Public`): Returns `{ "data": GalleryItem }` or `404` `{ "error": "Gallery item not found" }`.
- **`POST /api/v1/gallery`** (`Admin`): Body `GalleryItemCreateSchema`. Returns `201` `{ "data": GalleryItem }` or `409` `{ "error": "Gallery item exists" }`.
- **`PUT /api/v1/gallery/:id`** (`Admin`): Body `GalleryItemUpdateSchema`. Returns `200` `{ "data": GalleryItem }` or `404`.
- **`DELETE /api/v1/gallery/:id`** (`Admin`): Returns `200` `{ "data": { "id": string } }` or `404`.

---

## 10. Activities

### `Activity` DTO
```ts
type Activity = {
  id: string;          // Unique slug, e.g. "ddp0", "psaf"
  title: string;
  date: string;        // Optional display date label, e.g. "11-13 Agustus 2026" ("" when unset)
  description: string;
  image: ImageField;   // image.url is required (non-empty)
  position: number;    // Non-negative integer sort order
};
```

### Endpoints
- **`GET /api/v1/activities`** (`Public`):
  - **Query Params:** `search`, `page`, `limit`. Unfiltered requests without `page`/`limit` use a 60s TTL cache.
  - **Response `200`:** Paginated `{ "data": Activity[], "total", "page", "limit", "totalPages" }`.
- **`GET /api/v1/activities/:id`** (`Public`): Returns `{ "data": Activity }` or `404` `{ "error": "Activity not found" }`.
- **`POST /api/v1/activities`** (`Admin`): Body `ActivityCreateSchema`. Returns `201` `{ "data": Activity }` or `409` `{ "error": "Activity exists" }`.
- **`PUT /api/v1/activities/:id`** (`Admin`): Body `ActivityUpdateSchema`. Returns `200` `{ "data": Activity }` or `404`.
- **`DELETE /api/v1/activities/:id`** (`Admin`): Returns `200` `{ "data": { "id": string } }` or `404`.

---

## 11. Media Upload & Serving

All upload endpoints accept `multipart/form-data` with a single `file` field (`max fileSize: 2,621,440` bytes / 2.5 MB) and validate image magic bytes (`WebP`, `PNG`, `JPEG`; returns `415` on invalid/spoofed payloads).

### Upload Endpoints
- **`POST /api/v1/upload/avatar`** (`Whitelisted`)
  - Optional query `?npm=<10-digit-npm>` (non-admins can only upload for their own NPM; `403` otherwise).
  - Storage key: `members/<uuid>.<ext>`
- **`POST /api/v1/upload/achievement`** (`Admin`)
  - Optional query `?id=<slug>` (defaults to `banner`).
  - Storage key: `achievements/<safeId>-<uuid>.<ext>`
- **`POST /api/v1/upload/gallery`** (`Admin`)
  - Optional query `?id=<slug>` (defaults to `gallery`).
  - Storage key: `gallery/<safeId>-<timestamp>.<ext>`
- **`POST /api/v1/upload/activity`** (`Admin`)
  - Optional query `?id=<slug>` (defaults to `activity`).
  - Storage key: `activities/<safeId>-<timestamp>.<ext>`
- **`POST /api/v1/upload/request`** (`Whitelisted`)
  - Uploads an image attachment for content requests or feedback threads/replies.
  - Storage key: `requests/<callerNpm>-<uuid>.<ext>`

### Upload Response `200`
```json
{
  "data": {
    "url": "/api/v1/media/gallery/foto-angkatan-1-1795200000000.webp",
    "key": "gallery/foto-angkatan-1-1795200000000.webp",
    "width": 1600,
    "height": 1200,
    "mime": "image/webp",
    "size": 142310
  }
}
```

### `GET /api/v1/media/*`
- **Auth:** `Public`
- **Behavior:** Streams the object from S3 (SeaweedFS / AWS S3 / local fallback). Rejects path traversal (`..`) or invalid characters with `400` `{ "error": "Invalid media key" }`.
- **Headers:** `Content-Type: <obj.contentType>`, `Cache-Control: public, max-age=31536000, immutable`.

---

## 12. Content Requests

### DTOs
```ts
type RequestStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type ContentRequestType = 'achievement' | 'gallery' | 'activity' | 'other';

type ContentRequestSummary = {
  id: number;
  authorNpm: string;
  author?: { npm: string; name: string; nama_panggilan: string; foto?: ImageField };
  contentType: ContentRequestType;
  title: string;
  description: string;
  status: RequestStatus;
  image?: ImageField | null;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
};

type ContentRequestMessage = {
  id: number;
  requestId: number;
  authorNpm: string;
  authorRole: 'user' | 'admin';
  author?: { npm: string; name: string; nama_panggilan: string; foto?: ImageField };
  body: string;
  image?: ImageField | null;
  createdAt: number;
  updatedAt: number;
};

type ContentRequestDetail = ContentRequestSummary & {
  messages: ContentRequestMessage[];
};
```

### Endpoints
All endpoints require `Whitelisted` auth and return `Cache-Control: private, no-store`.
- **`GET /api/v1/content-requests`**:
  - **Query Params:** `contentType`, `status`, `search`, `scope` (`'mine'` forces owner filter even for admins), `page`, `limit`.
  - **Response `200`:** Paginated `ContentRequestSummary[]`. Non-admins only see their own threads.
- **`POST /api/v1/content-requests`**:
  - **Body:** `ContentRequestCreateSchema` (`{ contentType?, title, description, image? }`). Returns `201` `{ "data": ContentRequestDetail }`.
- **`GET /api/v1/content-requests/:id`**:
  - **Response `200`:** `{ "data": ContentRequestDetail }` (owner or admin only; `403` otherwise).
- **`PUT /api/v1/content-requests/:id`**:
  - **Body:** `ContentRequestUpdateSchema` (`{ contentType?, title?, description?, status?, image? }`). Non-admins may only update their own thread and may only change `status` to `'closed'` (`403` otherwise).
- **`DELETE /api/v1/content-requests/:id`**:
  - **Response `200`:** `{ "data": { "id": number } }` (owner or admin).
- **`POST /api/v1/content-requests/:id/messages`**:
  - **Body:** `{ body: string, image?: ImageField | null }`. Returns `201` `{ "data": ContentRequestMessage }`. Non-admins receive `400` if thread `status` is `'resolved'` or `'closed'`.
- **`PUT /api/v1/content-requests/:id/messages/:messageId`**:
  - **Body:** `{ body?: string, image?: ImageField | null }` (at least one required). Author or admin only.
- **`DELETE /api/v1/content-requests/:id/messages/:messageId`**:
  - **Response `200`:** `{ "data": { "id": number } }`. Author or admin only.

---

## 13. Feedback & Help Threads

### DTOs
```ts
type FeedbackCategory = 'feedback' | 'help' | 'other';

type FeedbackThreadSummary = {
  id: number;
  authorNpm: string;
  author?: { npm: string; name: string; nama_panggilan: string; foto?: ImageField };
  category: FeedbackCategory;
  title: string;
  description: string;
  status: RequestStatus;
  image?: ImageField | null;
  externalUrl?: string | null;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
};

type FeedbackMessage = {
  id: number;
  threadId: number;
  authorNpm: string;
  authorRole: 'user' | 'admin';
  author?: { npm: string; name: string; nama_panggilan: string; foto?: ImageField };
  body: string;
  image?: ImageField | null;
  createdAt: number;
  updatedAt: number;
};

type FeedbackThreadDetail = FeedbackThreadSummary & {
  messages: FeedbackMessage[];
};
```

### Endpoints
All endpoints require `Whitelisted` auth and return `Cache-Control: private, no-store`.
- **`GET /api/v1/feedback`**:
  - **Query Params:** `category`, `status`, `search`, `scope` (`'mine'` forces owner filter), `page`, `limit`.
  - **Response `200`:** Paginated `FeedbackThreadSummary[]`. Non-admins only see their own threads.
- **`POST /api/v1/feedback`**:
  - **Body:** `FeedbackThreadCreateSchema` (`{ category?, title, description, image?, externalUrl? }`). Returns `201` `{ "data": FeedbackThreadDetail }`.
- **`GET /api/v1/feedback/:id`**:
  - **Response `200`:** `{ "data": FeedbackThreadDetail }` (owner or admin only; `403` otherwise).
- **`PUT /api/v1/feedback/:id`**:
  - **Body:** `FeedbackThreadUpdateSchema`. Non-admins may only update their own thread and may only change `status` to `'closed'` (`403` otherwise).
- **`DELETE /api/v1/feedback/:id`**:
  - **Response `200`:** `{ "data": { "id": number } }` (owner or admin).
- **`POST /api/v1/feedback/:id/messages`**:
  - **Body:** `{ body: string, image?: ImageField | null }`. Returns `201` `{ "data": FeedbackMessage }`. Non-admins receive `400` if thread `status` is `'resolved'` or `'closed'`.
- **`PUT /api/v1/feedback/:id/messages/:messageId`**:
  - **Body:** `{ body?: string, image?: ImageField | null }`. Author or admin only.
- **`DELETE /api/v1/feedback/:id/messages/:messageId`**:
  - **Response `200`:** `{ "data": { "id": number } }`. Author or admin only.

---

## 14. Admin Stats

### `GET /api/v1/admin/stats`
- **Auth:** `Admin`
- **Headers:** `Cache-Control: private, no-store`
- **Response `200`:**
  ```json
  {
    "data": {
      "programs": 4,
      "courses": 64,
      "members": 546,
      "achievements": 12,
      "galleryItems": 18,
      "activities": 5,
      "openContentRequests": 3,
      "openFeedbackThreads": 2
    }
  }
  ```
