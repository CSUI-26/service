# PRD: Gallery & Activities CRUD (`@zenith/shared`, `@zenith/backend`, `@zenith/frontend`)

## 1. Objective & Context

Complete backend data model, REST API, S3 upload, and admin backoffice CRUD parity for the two remaining static content sections on [`https://zenith.csui.dev`](https://zenith.csui.dev):

1. **Galeri (`/gallery`) & Beranda Highlights (`/` — "Foto angkatan"):** Managed via a new `gallery_items` PostgreSQL table supporting cohort photos (`photo`), mascot/character illustrations (`hero` — *Karakter Zenith*), homepage photo highlights (`highlight`), and the bottom featured wide banner (`isFeatured`).
2. **Beranda Activities (`/` — "Kegiatan kami"):** Managed via a new `activities` PostgreSQL table supporting cohort orientation and milestone cards (e.g., `DDP0`, `PKKMB`, `PSAF`, `PMB`) with title, optional date label, description, cropped image metadata, and display ordering.

---

## 2. Data Model & Contracts

### 2.1 PostgreSQL Schema (`apps/backend/src/db/schema.ts`)

#### Table: `gallery_items`

| Column | Type | Constraints / Defaults | Description |
| --- | --- | --- | --- |
| `id` | `text('id')` | `PRIMARY KEY` | Human-readable slug (e.g., `foto-angkatan-1`, `racoon-1`, `highlight-1`) |
| `title` | `text('title')` | `NOT NULL` | Admin label / display title |
| `alt` | `text('alt')` | `NOT NULL` | Accessible alt text & caption rendered on `zenith.csui.dev` |
| `category` | `text('category')` | `NOT NULL` | Enum discriminator: `'photo' \| 'hero' \| 'highlight'` |
| `is_featured` | `boolean('is_featured')` | `NOT NULL DEFAULT false` | Marks the featured wide banner photo on `/gallery` (`lastImage`) |
| `image` | `jsonb('image')` | `NOT NULL` | `{ url: string; config?: ImageConfig }` |
| `position` | `integer('position')` | `NOT NULL DEFAULT 0` | Display sort order (`ASC`) within category |
| `created_at` | `integer('created_at')` | `NOT NULL DEFAULT extract(epoch from now())::int` | Unix epoch timestamp (seconds) |
| `updated_at` | `integer('updated_at')` | `NOT NULL DEFAULT extract(epoch from now())::int` | Unix epoch timestamp (seconds) |

- **Indexes:**
  - `idx_gallery_items_category` on `(category)`
  - `idx_gallery_items_featured` on `(is_featured)`
  - `idx_gallery_items_position` on `(position)`

#### Table: `activities`

| Column | Type | Constraints / Defaults | Description |
| --- | --- | --- | --- |
| `id` | `text('id')` | `PRIMARY KEY` | Human-readable slug (e.g., `ddp0`, `pkkmb`, `psaf`, `pmb`) |
| `title` | `text('title')` | `NOT NULL` | Activity title (e.g., `DDP0`, `PSAF`) |
| `date` | `text('date')` | Nullable | Optional human-readable date label (e.g., `11-13 Agustus 2026`) |
| `description` | `text('description')` | `NOT NULL` | Activity summary text |
| `image` | `jsonb('image')` | `NOT NULL` | `{ url: string; config?: ImageConfig }` |
| `position` | `integer('position')` | `NOT NULL DEFAULT 0` | Display sort order (`ASC`) in the activities carousel |
| `created_at` | `integer('created_at')` | `NOT NULL DEFAULT extract(epoch from now())::int` | Unix epoch timestamp (seconds) |
| `updated_at` | `integer('updated_at')` | `NOT NULL DEFAULT extract(epoch from now())::int` | Unix epoch timestamp (seconds) |

- **Indexes:**
  - `idx_activities_position` on `(position)`

### 2.2 Shared Zod Schemas (`packages/shared/src/index.ts`)

- **`GalleryCategorySchema`:** `z.enum(['photo', 'hero', 'highlight'])`
- **`GalleryItemSchema` / `GalleryItemCreateSchema` / `GalleryItemUpdateSchema`:**
  - Validates non-empty `id`, `title`, `alt`, `category`, `isFeatured` (`default(false)`), `position` (`z.number().int().min(0).default(0)`), and `image` (`ImageFieldSchema` requiring a non-empty `image.url`).
  - `GalleryItemUpdateSchema` omits `id` and makes fields partial while still rejecting empty `image.url` if `image` is provided.
- **`PublicGalleryResponseSchema` (`GET /api/v1/gallery?format=grouped`):**
  - `{ photos: GalleryItem[], heroes: GalleryItem[], highlights: GalleryItem[], featuredPhoto: GalleryItem | null }`
  - `featuredPhoto` resolves to the first item with `category === 'photo'` and `isFeatured === true` (ordered by `asc(position), asc(id)`), falling back to the last `photo` item if none is explicitly marked featured.
- **`ActivitySchema` / `ActivityCreateSchema` / `ActivityUpdateSchema`:**
  - Validates non-empty `id`, `title`, `description`, optional `date` (`z.string().optional().default('')`), `position` (`z.number().int().min(0).default(0)`), and `image` (`ImageFieldSchema` requiring a non-empty `image.url`).
  - `ActivityUpdateSchema` omits `id` and makes fields partial.

---

## 3. REST API, Caching & Auth Boundaries

### 3.1 Endpoints (`apps/backend/src/routes/`)

| Method & Path | Auth Middleware | Query / Body Contract | Response & Cache Semantics |
| --- | --- | --- | --- |
| `GET /api/v1/gallery` | Public (unauthenticated) | `?format=grouped` OR `?category=photo\|hero\|highlight&featured=true\|false&search=&page=1&limit=20` | `200 OK`. `Vary: Cookie, Authorization`. Unauthed: `Cache-Control: public, max-age=60, stale-while-revalidate=300`. Authed: `private, no-store`. `?format=grouped` uses 60s in-memory `createTtlCache`. |
| `GET /api/v1/gallery/:id` | Public (unauthenticated) | Path param `:id` | `200 OK` `{ data: GalleryItem }` or `404 Not Found`. Same `Cache-Control` rules. |
| `POST /api/v1/gallery` | `blockUnauthorized()` + `adminOnly()` | `GalleryItemCreateSchema` | `201 Created` `{ data: GalleryItem }` or `409 Conflict` if `id` exists. Invalidates gallery TTL cache. |
| `PUT /api/v1/gallery/:id` | `blockUnauthorized()` + `adminOnly()` | `GalleryItemUpdateSchema` | `200 OK` `{ data: GalleryItem }` or `404 Not Found`. Invalidates gallery TTL cache. |
| `DELETE /api/v1/gallery/:id` | `blockUnauthorized()` + `adminOnly()` | Path param `:id` | `200 OK` `{ data: { id } }` or `404 Not Found`. Invalidates gallery TTL cache. |
| `GET /api/v1/activities` | Public (unauthenticated) | `?search=&page=1&limit=20` | `200 OK` paginated envelope `{ data, total, page, limit, totalPages }`. Unfiltered full list uses 60s TTL cache. Same `Cache-Control` rules. |
| `GET /api/v1/activities/:id` | Public (unauthenticated) | Path param `:id` | `200 OK` `{ data: Activity }` or `404 Not Found`. |
| `POST /api/v1/activities` | `blockUnauthorized()` + `adminOnly()` | `ActivityCreateSchema` | `201 Created` `{ data: Activity }` or `409 Conflict` if `id` exists. Invalidates activities TTL cache. |
| `PUT /api/v1/activities/:id` | `blockUnauthorized()` + `adminOnly()` | `ActivityUpdateSchema` | `200 OK` `{ data: Activity }` or `404 Not Found`. Invalidates activities TTL cache. |
| `DELETE /api/v1/activities/:id` | `blockUnauthorized()` + `adminOnly()` | Path param `:id` | `200 OK` `{ data: { id } }` or `404 Not Found`. Invalidates activities TTL cache. |
| `POST /api/v1/upload/gallery` | `blockUnauthorized()` + `adminOnly()` | Multipart form-data (`file`, max `2,621,440` bytes), `?id=<slug>` | Uploads to S3/MinIO under `gallery/${safeId}-${Date.now()}.${ext}` and returns `{ data: { url, key, width, height, mime, size } }`. |
| `POST /api/v1/upload/activity` | `blockUnauthorized()` + `adminOnly()` | Multipart form-data (`file`, max `2,621,440` bytes), `?id=<slug>` | Uploads to S3/MinIO under `activities/${safeId}-${Date.now()}.${ext}` and returns `{ data: { url, key, width, height, mime, size } }`. |

### 3.2 Edge Cases & Data Integrity

1. **Duplicate Slug Collision (`409 Conflict`):** `POST /api/v1/gallery` and `POST /api/v1/activities` check `getGalleryItemById(body.id)` / `getActivityById(body.id)` before insert and return `409 Conflict` (`{ error: 'Gallery item exists' }` / `{ error: 'Activity exists' }`).
2. **Featured Banner Fallback:** If an admin marks multiple `photo` items as `isFeatured: true`, `GET /api/v1/gallery?format=grouped` deterministically selects the lowest `position` (then `id`). If zero items have `isFeatured: true`, `featuredPhoto` falls back to the last `photo` item in sort order so `/gallery` never renders an empty banner slot.
3. **Aspect Ratio Presets per Category:**
   - `gallery_items` with `category === 'photo'` (non-featured) or `'highlight'`: defaults `ImageConfig.aspect` to `'4:3'`.
   - `gallery_items` with `category === 'photo'` and `isFeatured === true`: defaults `ImageConfig.aspect` to `'16:9'`.
   - `gallery_items` with `category === 'hero'` (*Karakter Zenith*): defaults `ImageConfig.aspect` to `'4:7'` (`1 / 1.75`).
   - `activities`: defaults `ImageConfig.aspect` to `'16:9'`.
4. **Immediate Studio Cache Bypass:** Authenticated admin mutations and table reloads send `Cookie` / `Authorization`, triggering `Cache-Control: private, no-store` on `GET` responses and clearing the backend `createTtlCache` so UI updates reflect immediately without stale reads.

---

## 4. Frontend Admin Dashboard UX (`@zenith/frontend`)

Following `apps/frontend/DESIGN.md`:

1. **Routes & Navigation (`apps/frontend/src/app/router.tsx` & `navigation.ts`):**
   - `/gallery` (`GalleryPage`) wrapped in `<AdminRoute>` (`label: 'Gallery'`, `description: 'Manage cohort photos & mascots'`, `icon: Images`, `requireAdmin: true`).
   - `/activities` (`ActivitiesPage`) wrapped in `<AdminRoute>` (`label: 'Activities'`, `description: 'Manage cohort activities'`, `icon: Calendar`, `requireAdmin: true`).
2. **Utilitarian Admin View Pattern:**
   - Concise English copy, zero em-dashes/en-dashes, no onboarding banners.
   - Filter bar with `SearchInput` (`/` shortcut to focus), category/featured `Select` filters (on `/gallery`), and **Add item** / **Add activity** primary CTA (`n` keyboard shortcut).
   - High-density primitive `Table` (`AdminDataTable` / `ListState` + `Paginator`) displaying thumbnail preview (with `ImageConfig` crop transform applied), title, slug ID (`font-mono`), category/date badge, `position` (`font-mono tabular-nums`), and edit/delete icon actions.
   - `GalleryFormDialog` and `ActivityFormDialog` built on `FormDialog` + `ImageUploadEditor` (with default-locked `Lock Photo` gesture protection and auto-slug generation from `title` when creating a new record) + `ConfirmDialog` for deletions.

---

## 5. Seed Data (`data/` & `apps/backend/src/db/seed.ts`)

- **`data/gallery.json`:** Initial seed records mirroring `zenith.csui.dev` (`foto-angkatan-1` through `foto-angkatan-4` under `category: 'photo'`, `racoon-1` and `racoon-2` under `category: 'hero'`, and `highlight-1` and `highlight-2` under `category: 'highlight'`).
- **`data/activities.json`:** Initial seed records mirroring `zenith.csui.dev` (`ddp0`, `pkkmb`, `psaf` with `date: '11-13 Agustus 2026'`, and `pmb`).
- **`seed.ts`:** Adds `seedGallery()` and `seedActivities()` using `migrateImageToS3()` and runs them in `pnpm --filter @zenith/backend run seed`.

---

## 6. In-Scope vs. Out-of-Scope

### In-Scope
- **Shared Contracts (`@zenith/shared`):** `GalleryCategorySchema`, `GalleryItemSchema`, `GalleryItemCreateSchema`, `GalleryItemUpdateSchema`, `PublicGalleryResponseSchema`, `ActivitySchema`, `ActivityCreateSchema`, `ActivityUpdateSchema`, and exported TypeScript types.
- **Database Schema & Migration (`@zenith/backend`):** `gallery_items` and `activities` tables in `apps/backend/src/db/schema.ts` and a new Drizzle SQL migration in `apps/backend/drizzle/`.
- **Backend Repositories & Routes (`@zenith/backend`):**
  - `apps/backend/src/db/repositories/gallery.ts` and `activities.ts` (re-exported via `repository.ts`) with 60s `createTtlCache` and cache invalidation.
  - `apps/backend/src/routes/gallery.ts` and `activities.ts` registered in `apps/backend/src/app.ts`.
  - `POST /api/v1/upload/gallery` and `POST /api/v1/upload/activity` in `apps/backend/src/routes/upload.ts`.
- **Database Seeding (`data/` & `@zenith/backend`):** `data/gallery.json`, `data/activities.json`, and `seedGallery()` / `seedActivities()` in `apps/backend/src/db/seed.ts`.
- **Frontend Admin CRUD (`@zenith/frontend`):**
  - `apps/frontend/src/features/gallery/*` (`GalleryPage.tsx`, `GalleryFormDialog.tsx`, `api.ts`, `schema.ts`).
  - `apps/frontend/src/features/activities/*` (`ActivitiesPage.tsx`, `ActivityFormDialog.tsx`, `api.ts`, `schema.ts`).
  - Admin route registration in `router.tsx` and dropdown items in `navigation.ts`.
- **Automated Tests (`Vitest`):**
  - Backend schema & API integration tests for `/api/v1/gallery` and `/api/v1/activities` (public read, `?format=grouped`, `401`/`403` auth boundaries, `409` duplicate slug, CRUD lifecycle).
  - Frontend unit/component tests for `GalleryPage` and `ActivitiesPage`.

### Out-of-Scope
- Modifying the read-only `apps/website` (`CSUI-26/website` Astro submodule).
- Member self-service uploads or non-admin submission workflows for gallery items or activities (all mutations are strictly admin-only).
- Multi-image upload per single `gallery_items` or `activities` row (each row maps 1:1 to a single `image` JSONB object).
- Changing existing `programs`, `semesters`, `courses`, `members`, or `achievements` schemas, endpoints, or SSO-UI authentication middleware.
- Increasing the 2.5 MB backend multipart upload limit (client-side WebP compression in `ImageUploadEditor` handles resizing before upload).
