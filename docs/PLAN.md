# Gallery & Activities CRUD Implementation Plan (`@zenith/shared`, `@zenith/backend`, `@zenith/frontend`)

> **For agentic workers:** Implement this plan task-by-task in sequential order. Every task modifies **at most 2 files** and concludes with an explicit, deterministic verification command. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full-stack CRUD for the `gallery_items` and `activities` tables specified in [`docs/PRD.md`](file:///home/antigravity/VickyIbr/CSUI26/docs/PRD.md), achieving complete backend API, S3 upload, seed script, and admin dashboard parity with [`https://zenith.csui.dev`](https://zenith.csui.dev):
1. Shared Zod v4 schemas and DTO types (`GalleryCategorySchema`, `GalleryItemSchema`, `PublicGalleryResponseSchema`, `ActivitySchema`) in `@zenith/shared`.
2. PostgreSQL tables (`gallery_items` and `activities`), Drizzle SQL migration (`0003_gallery_and_activities.sql`), 60s TTL cached repositories, Fastify REST routes (`/api/v1/gallery`, `/api/v1/activities`), and S3 multipart upload endpoints (`/api/v1/upload/gallery`, `/api/v1/upload/activity`) in `@zenith/backend`.
3. Seed JSON datasets (`data/gallery.json`, `data/activities.json`) and S3 media migration seeders in `apps/backend/src/db/seed.ts`.
4. Utilitarian admin CRUD pages (`/gallery` and `/activities`) inside `AdminRoute` in `@zenith/frontend` with dynamic aspect-ratio presets (`4:3`, `4:7`, `16:9`) and `Lock Photo` gesture protection.

**Tech Stack:** pnpm Workspaces, Turborepo, Fastify v5, Drizzle ORM (`postgres`), PostgreSQL 16, Zod v4, React 19, React Router (`react-router`), Vite, Tailwind CSS v4, `radix-ui`, `shadcn/ui`, `lucide-react`, Vitest, Oxlint.

**References:**
- Product Requirements: [`docs/PRD.md`](file:///home/antigravity/VickyIbr/CSUI26/docs/PRD.md)
- Frontend Visual & Anti-Slop System: [`apps/frontend/DESIGN.md`](file:///home/antigravity/VickyIbr/CSUI26/apps/frontend/DESIGN.md)

---

## Global Principles (`writing-plans`, `ponytail`, `ui-ux-pro-max`, `anti-slop`)

1. **Native Capabilities First (`ponytail`):**
   - Install **zero** new third-party dependencies.
   - Use native Fastify plugins (`@fastify/multipart`), native Drizzle ORM queries, existing in-memory `createTtlCache` (`apps/backend/src/lib/cache.js`), native browser `HTMLCanvasElement` WebP encoding (`renderCroppedWebp`), and existing `radix-ui` / `shadcn/ui` workspace components (`Table`, `Select`, `Field`, `Dialog`, `Badge`, `Button`).
2. **Design Tokens & Typography Scale (`ui-ux-pro-max` & [`apps/frontend/DESIGN.md`](file:///home/antigravity/VickyIbr/CSUI26/apps/frontend/DESIGN.md)):**
   - **Dark Default (`.dark` — Zenith Obsidian):** `--background: #05060d`, `--foreground: #f8fafc`, `--card: #0c101d`, `--muted: #12182b`, `--muted-foreground: #94a3b8`, `--primary: #3b82f6`, `--border: rgba(255, 255, 255, 0.10)`.
   - **Light Mode (`:root` — Slate High-Contrast):** `--background: #f8fafc`, `--foreground: #0f172a`, `--card: #ffffff`, `--muted: #f1f5f9`, `--muted-foreground: #475569`, `--primary: #2563eb`, `--border: #e2e8f0`.
   - **Typography Scale:**
     - Page Title (`PageHeader`): `text-xl sm:text-2xl font-bold tracking-tight` (`Geist Variable`)
     - Section / Dialog Heading: `text-sm sm:text-base font-bold`
     - Table Cell Body: `text-xs sm:text-sm leading-relaxed` (`Inter`)
     - Hint / Caption / Alt Preview: `text-xs text-muted-foreground`
     - Slug IDs, Position Orders & Aspect Ratios: `font-mono tabular-nums text-xs` (`JetBrains Mono`)
3. **Anti-Slop Gates ([`miqdadbadjuber/anti-slop`](https://github.com/miqdadbadjuber/anti-slop)):**
   - **R-01 (Purposeful Surfaces):** Keep `/gallery` and `/activities` admin views flat, compact, and scannable using `Table` primitives without decorative hero banners or marketing fluff.
   - **R-02 (Direct, Non-Dev Copywriting):** Zero em-dashes (`—`) or en-dashes (`–`) in UI copy. Zero corporate buzzwords ("seamless", "elevate", "empower", "unlock", "robust"). Use direct English labels (`Add gallery item`, `Edit activity`, `Delete`).
   - **R-03 (Accessible Affordances & Motion):** Every icon-only action button (`Edit`, `Delete`, `Reset filters`) must have an explicit `aria-label`. Transitions stay within `150ms–200ms` with `prefers-reduced-motion` safeguards.
   - **R-04 (Code Hygiene):** Zero literal hex colors in `.tsx` files, zero empty `catch` blocks, and zero `window.confirm` calls (always use `ConfirmDialog`).
4. **Atomic Sequential Execution (Max 2 Files per Task):**
   - Each task below touches **at most 2 files** and includes a deterministic verification command.

---

## File Map

- **Modify:**
  - `packages/shared/src/index.ts` — Add `GalleryCategorySchema`, `GalleryItem*Schema`, `PublicGalleryResponseSchema`, `Activity*Schema`, and exported DTO types.
  - `apps/backend/src/db/schema.ts` — Add `galleryItems` (`gallery_items`) and `activities` (`activities`) Drizzle table definitions.
  - `apps/backend/drizzle/meta/_journal.json` — Register migration `0003_gallery_and_activities`.
  - `apps/backend/src/db/repository.ts` — Re-export `repositories/gallery.js` and `repositories/activities.js`.
  - `apps/backend/src/app.ts` — Register `galleryRoutes` and `activityRoutes`.
  - `apps/backend/src/routes/upload.ts` — Add `POST /api/v1/upload/gallery` and `POST /api/v1/upload/activity`.
  - `apps/backend/src/db/seed.ts` — Add `seedGallery()` and `seedActivities()`.
  - `apps/frontend/src/lib/api.ts` — Extend `UploadEndpoint` union in `uploadMedia` with `'/upload/gallery' | '/upload/activity'`.
  - `apps/frontend/src/components/patterns/ImageUploadEditor.tsx` — Support `'/upload/gallery' | '/upload/activity'` and configurable `defaultAspect` prop (`'1:1' | '4:3' | '4:7' | '16:9'`).
  - `apps/frontend/src/app/router.tsx` — Register `/gallery` and `/activities` inside `AdminRoute`.
  - `apps/frontend/src/app/navigation.ts` — Add `Gallery` and `Activities` items under the Admin dropdown section.
  - `apps/frontend/src/app/navigation.test.ts` — Add route matching assertions for `/gallery` and `/activities`.
- **Create:**
  - `apps/backend/drizzle/0003_gallery_and_activities.sql` — SQL DDL for `gallery_items`, `activities`, and indexes.
  - `apps/backend/src/__tests__/gallery-activities-schema.test.ts` — Unit tests for Zod contracts and Drizzle columns.
  - `apps/backend/src/db/repositories/gallery.ts` — CRUD + `getGroupedGallery()` with 60s `createTtlCache`.
  - `apps/backend/src/db/repositories/activities.ts` — CRUD + 60s `createTtlCache` for unfiltered list.
  - `apps/backend/src/routes/gallery.ts` — Fastify routes for `/api/v1/gallery` and `/api/v1/gallery/:id`.
  - `apps/backend/src/routes/activities.ts` — Fastify routes for `/api/v1/activities` and `/api/v1/activities/:id`.
  - `apps/backend/src/__tests__/gallery-activities-api.test.ts` — Integration tests for gallery & activities routes, auth boundaries, caching headers, and S3 upload endpoints.
  - `data/gallery.json` — Seed dataset for `zenith.csui.dev` gallery photos, mascot heroes, and homepage highlights.
  - `data/activities.json` — Seed dataset for `zenith.csui.dev` cohort activities (`DDP0`, `PKKMB`, `PSAF`, `PMB`).
  - `apps/frontend/src/features/gallery/api.ts` — Frontend API client for `/api/v1/gallery`.
  - `apps/frontend/src/features/gallery/schema.ts` — Form schema, slug helper, and category aspect-ratio presets.
  - `apps/frontend/src/features/gallery/GalleryFormDialog.tsx` — Modal dialog with `ImageUploadEditor` and dynamic aspect ratio (`4:3`, `4:7`, `16:9`).
  - `apps/frontend/src/features/gallery/GalleryPage.tsx` — Utilitarian admin table with category/featured filters and keyboard shortcuts (`n`, `/`).
  - `apps/frontend/src/features/activities/api.ts` — Frontend API client for `/api/v1/activities`.
  - `apps/frontend/src/features/activities/schema.ts` — Form schema and payload mapper for activities.
  - `apps/frontend/src/features/activities/ActivityFormDialog.tsx` — Modal dialog for creating/editing activities with `16:9` `ImageUploadEditor`.
  - `apps/frontend/src/features/activities/ActivitiesPage.tsx` — Utilitarian admin table for cohort activities.
  - `apps/frontend/src/features/gallery/GalleryAndActivitiesPage.test.tsx` — Component & anti-slop unit tests for `GalleryPage` and `ActivitiesPage`.

---

### Task 1: Add Gallery & Activity Zod Schemas and DTO Types to `@zenith/shared`

**Files (1):**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Define `GalleryCategorySchema`, `GalleryItem*Schema`, `PublicGalleryResponseSchema`, and `Activity*Schema` in `packages/shared/src/index.ts`**
  - Add a required image field schema helper:
    ```ts
    export const RequiredImageFieldSchema = z.object({
      url: optionalImageUrl.refine((val) => val.trim().length > 0, 'Image URL is required'),
      config: ImageConfigSchema.optional(),
    });
    ```
  - Add Gallery schemas:
    ```ts
    export const GalleryCategorySchema = z.enum(['photo', 'hero', 'highlight']);

    export const GalleryItemSchema = z.object({
      id: z.string().min(1, 'Gallery item ID required'),
      title: z.string().min(1, 'Title required'),
      alt: z.string().min(1, 'Alt text required'),
      category: GalleryCategorySchema,
      isFeatured: z.boolean(),
      image: RequiredImageFieldSchema,
      position: z.number().int().min(0),
    });

    export const GalleryItemCreateSchema = z.object({
      id: z.string().min(1, 'Gallery item ID required'),
      title: z.string().min(1, 'Title required'),
      alt: z.string().min(1, 'Alt text required'),
      category: GalleryCategorySchema.default('photo'),
      isFeatured: z.boolean().default(false),
      image: RequiredImageFieldSchema,
      position: z.number().int().min(0).default(0),
    });

    export const GalleryItemUpdateSchema = z
      .object({
        title: z.string().min(1, 'Title required'),
        alt: z.string().min(1, 'Alt text required'),
        category: GalleryCategorySchema,
        isFeatured: z.boolean(),
        image: RequiredImageFieldSchema,
        position: z.number().int().min(0),
      })
      .partial();

    export const PublicGalleryResponseSchema = z.object({
      photos: z.array(GalleryItemSchema),
      heroes: z.array(GalleryItemSchema),
      highlights: z.array(GalleryItemSchema),
      featuredPhoto: GalleryItemSchema.nullable(),
    });
    ```
  - Add Activity schemas:
    ```ts
    export const ActivitySchema = z.object({
      id: z.string().min(1, 'Activity ID required'),
      title: z.string().min(1, 'Activity title required'),
      date: z.string(),
      description: z.string().min(1, 'Description required'),
      image: RequiredImageFieldSchema,
      position: z.number().int().min(0),
    });

    export const ActivityCreateSchema = z.object({
      id: z.string().min(1, 'Activity ID required'),
      title: z.string().min(1, 'Activity title required'),
      date: z.string().default(''),
      description: z.string().min(1, 'Description required'),
      image: RequiredImageFieldSchema,
      position: z.number().int().min(0).default(0),
    });

    export const ActivityUpdateSchema = z
      .object({
        title: z.string().min(1, 'Activity title required'),
        date: z.string(),
        description: z.string().min(1, 'Description required'),
        image: RequiredImageFieldSchema,
        position: z.number().int().min(0),
      })
      .partial();
    ```
  - Export inferred TypeScript types: `GalleryCategory`, `GalleryItem`, `GalleryItemCreate`, `GalleryItemUpdate`, `PublicGalleryResponse`, `Activity`, `ActivityCreate`, `ActivityUpdate`.

- [ ] **Step 2: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/shared run build && pnpm --filter @zenith/shared run lint
  ```

---

### Task 2: Add `gallery_items` and `activities` Tables to Drizzle Schema & Migration SQL

**Files (2):**
- Modify: `apps/backend/src/db/schema.ts`
- Create: `apps/backend/drizzle/0003_gallery_and_activities.sql`

- [ ] **Step 1: Add `galleryItems` and `activities` table definitions to `apps/backend/src/db/schema.ts`**
  ```ts
  export const galleryItems = pgTable('gallery_items', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    alt: text('alt').notNull(),
    category: text('category').notNull().default('photo'),
    isFeatured: boolean('is_featured').notNull().default(false),
    image: jsonb('image').$type<{ url: string; config?: ImageConfig }>().notNull(),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
    updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
  }, (table) => ({
    categoryIdx: index('idx_gallery_items_category').on(table.category),
    featuredIdx: index('idx_gallery_items_featured').on(table.isFeatured),
    positionIdx: index('idx_gallery_items_position').on(table.position),
  }));

  export const activities = pgTable('activities', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    date: text('date'),
    description: text('description').notNull(),
    image: jsonb('image').$type<{ url: string; config?: ImageConfig }>().notNull(),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
    updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
  }, (table) => ({
    positionIdx: index('idx_activities_position').on(table.position),
  }));
  ```

- [ ] **Step 2: Create `apps/backend/drizzle/0003_gallery_and_activities.sql`**
  ```sql
  CREATE TABLE IF NOT EXISTS "gallery_items" (
  	"id" text PRIMARY KEY NOT NULL,
  	"title" text NOT NULL,
  	"alt" text NOT NULL,
  	"category" text DEFAULT 'photo' NOT NULL,
  	"is_featured" boolean DEFAULT false NOT NULL,
  	"image" jsonb NOT NULL,
  	"position" integer DEFAULT 0 NOT NULL,
  	"created_at" integer DEFAULT extract(epoch from now())::int NOT NULL,
  	"updated_at" integer DEFAULT extract(epoch from now())::int NOT NULL
  );
  --> statement-breakpoint
  CREATE INDEX IF NOT EXISTS "idx_gallery_items_category" ON "gallery_items" USING btree ("category");
  --> statement-breakpoint
  CREATE INDEX IF NOT EXISTS "idx_gallery_items_featured" ON "gallery_items" USING btree ("is_featured");
  --> statement-breakpoint
  CREATE INDEX IF NOT EXISTS "idx_gallery_items_position" ON "gallery_items" USING btree ("position");
  --> statement-breakpoint
  CREATE TABLE IF NOT EXISTS "activities" (
  	"id" text PRIMARY KEY NOT NULL,
  	"title" text NOT NULL,
  	"date" text,
  	"description" text NOT NULL,
  	"image" jsonb NOT NULL,
  	"position" integer DEFAULT 0 NOT NULL,
  	"created_at" integer DEFAULT extract(epoch from now())::int NOT NULL,
  	"updated_at" integer DEFAULT extract(epoch from now())::int NOT NULL
  );
  --> statement-breakpoint
  CREATE INDEX IF NOT EXISTS "idx_activities_position" ON "activities" USING btree ("position");
  ```

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

---

### Task 3: Register Migration in Drizzle Journal & Add Schema Unit Tests

**Files (2):**
- Modify: `apps/backend/drizzle/meta/_journal.json`
- Create: `apps/backend/src/__tests__/gallery-activities-schema.test.ts`

- [ ] **Step 1: Append entry `idx: 3` (`0003_gallery_and_activities`) to `apps/backend/drizzle/meta/_journal.json`**
  ```json
  {
    "idx": 3,
    "version": "7",
    "when": 1795200000000,
    "tag": "0003_gallery_and_activities",
    "breakpoints": true
  }
  ```

- [ ] **Step 2: Create `apps/backend/src/__tests__/gallery-activities-schema.test.ts`**
  - Test `GalleryItemCreateSchema`, `GalleryItemUpdateSchema`, `PublicGalleryResponseSchema`, `ActivityCreateSchema`, and `ActivityUpdateSchema` validation (including rejecting empty `image.url`, invalid `category`, and ensuring partial updates do not inject defaults).
  - Test `getTableColumns(galleryItems)` and `getTableColumns(activities)` column names and snake_case DB mappings.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend test -- src/__tests__/gallery-activities-schema.test.ts
  ```

---

### Task 4: Implement Gallery & Activities Repositories with 60s TTL Cache

**Files (2):**
- Create: `apps/backend/src/db/repositories/gallery.ts`
- Create: `apps/backend/src/db/repositories/activities.ts`

- [ ] **Step 1: Create `apps/backend/src/db/repositories/gallery.ts`**
  - Instantiate `const galleryCache = createTtlCache<PublicGalleryResponse>(60_000);` and `invalidateGalleryCache()`.
  - Implement:
    - `countGalleryItems(filters: { search?: string; category?: GalleryCategory; isFeatured?: boolean })`
    - `getAllGalleryItems(opts: { search?: string; category?: GalleryCategory; isFeatured?: boolean; limit?: number; offset?: number })` ordered by `asc(galleryItems.position), asc(galleryItems.id)`.
    - `getGroupedGallery(): Promise<PublicGalleryResponse>`:
      - Checks `galleryCache.get('gallery:grouped')`.
      - Queries all rows ordered by `asc(galleryItems.position), asc(galleryItems.id)`.
      - Splits into `photos`, `heroes`, `highlights`.
      - Sets `featuredPhoto` to the first `photos` item with `isFeatured === true`, falling back to `photos[photos.length - 1] ?? null`.
    - `getGalleryItemById(id: string)`
    - `createGalleryItem(input: GalleryItemCreate)` (invalidates `galleryCache`)
    - `updateGalleryItem(id: string, updates: GalleryItemUpdate)` (updates `updatedAt`, invalidates `galleryCache`)
    - `deleteGalleryItem(id: string)` (invalidates `galleryCache`)

- [ ] **Step 2: Create `apps/backend/src/db/repositories/activities.ts`**
  - Instantiate `const activitiesCache = createTtlCache<Activity[]>(60_000);` and `invalidateActivitiesCache()`.
  - Implement:
    - `countActivities(filters: { search?: string })`
    - `getAllActivities(opts: { search?: string; limit?: number; offset?: number })` ordered by `asc(activities.position), asc(activities.id)` (uses `activitiesCache` when no filters/pagination are passed).
    - `getActivityById(id: string)`
    - `createActivity(input: ActivityCreate)` (invalidates `activitiesCache`)
    - `updateActivity(id: string, updates: ActivityUpdate)` (updates `updatedAt`, invalidates `activitiesCache`)
    - `deleteActivity(id: string)` (invalidates `activitiesCache`)

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

---

### Task 5: Export Repositories in Barrel & Implement `/api/v1/gallery` Routes

**Files (2):**
- Modify: `apps/backend/src/db/repository.ts`
- Create: `apps/backend/src/routes/gallery.ts`

- [ ] **Step 1: Re-export `gallery.js` and `activities.js` in `apps/backend/src/db/repository.ts`**
  ```ts
  export * from './repositories/programs.js';
  export * from './repositories/courses.js';
  export * from './repositories/members.js';
  export * from './repositories/achievements.js';
  export * from './repositories/gallery.js';
  export * from './repositories/activities.js';
  ```

- [ ] **Step 2: Create `apps/backend/src/routes/gallery.ts`**
  - Mirror [`apps/backend/src/routes/achievements.ts`](file:///home/antigravity/VickyIbr/CSUI26/apps/backend/src/routes/achievements.ts):
    - `GET /api/v1/gallery`:
      - Sets `Vary: Cookie, Authorization` and `Cache-Control` (`private, no-store` if authenticated request, else `public, max-age=60, stale-while-revalidate=300`).
      - Returns `{ data: await repo.getGroupedGallery() }` when `query.format === 'grouped'`.
      - Otherwise parses `page`, `limit`, `search`, `category` (`GalleryCategorySchema.safeParse`), and `featured` (`'true' | 'false'`), returning `{ data, total, page, limit, totalPages }`.
    - `GET /api/v1/gallery/:id`: returns `{ data: item }` or `404` `{ error: 'Gallery item not found' }`.
    - `POST /api/v1/gallery` (`preHandler: [blockUnauthorized(), adminOnly()]`): validates `GalleryItemCreateSchema`, returns `409` `{ error: 'Gallery item exists' }` on duplicate `id`, or `201` `{ data: created }`.
    - `PUT /api/v1/gallery/:id` (`preHandler: [blockUnauthorized(), adminOnly()]`): validates `GalleryItemUpdateSchema`, returns `404` if missing, or `200` `{ data: updated }`.
    - `DELETE /api/v1/gallery/:id` (`preHandler: [blockUnauthorized(), adminOnly()]`): returns `404` if missing, or `200` `{ data: { id } }`.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

---

### Task 6: Implement `/api/v1/activities` Routes & Register Plugins in `app.ts`

**Files (2):**
- Create: `apps/backend/src/routes/activities.ts`
- Modify: `apps/backend/src/app.ts`

- [ ] **Step 1: Create `apps/backend/src/routes/activities.ts`**
  - Implement:
    - `GET /api/v1/activities` (supports `?search=&page=&limit=`, sets `Vary: Cookie, Authorization` and auth-aware `Cache-Control`, returns `{ data, total, page, limit, totalPages }`).
    - `GET /api/v1/activities/:id` (returns `{ data: activity }` or `404` `{ error: 'Activity not found' }`).
    - `POST /api/v1/activities` (`preHandler: [blockUnauthorized(), adminOnly()]`, validates `ActivityCreateSchema`, returns `409` `{ error: 'Activity exists' }` on duplicate `id`, or `201` `{ data: created }`).
    - `PUT /api/v1/activities/:id` (`preHandler: [blockUnauthorized(), adminOnly()]`, validates `ActivityUpdateSchema`, returns `404` or `200` `{ data: updated }`).
    - `DELETE /api/v1/activities/:id` (`preHandler: [blockUnauthorized(), adminOnly()]`, returns `404` or `200` `{ data: { id } }`).

- [ ] **Step 2: Register `galleryRoutes` and `activityRoutes` in `apps/backend/src/app.ts`**
  - Import `galleryRoutes` from `./routes/gallery.js` and `activityRoutes` from `./routes/activities.js`, and call `fastify.register(galleryRoutes)` and `fastify.register(activityRoutes)`.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

---

### Task 7: Add `/api/v1/upload/gallery` & `/api/v1/upload/activity` Endpoints and Backend Integration Tests

**Files (2):**
- Modify: `apps/backend/src/routes/upload.ts`
- Create: `apps/backend/src/__tests__/gallery-activities-api.test.ts`

- [ ] **Step 1: Add `POST /api/v1/upload/gallery` and `POST /api/v1/upload/activity` to `apps/backend/src/routes/upload.ts`**
  - Helper `sanitizeUploadSlug(rawId: string | undefined, fallback: string)` to normalize `?id=` query param.
  - `fastify.post('/api/v1/upload/gallery', { preHandler: [blockUnauthorized(), adminOnly()] }, ...)` storing under `gallery/${safeId}-${Date.now()}.${ext}`.
  - `fastify.post('/api/v1/upload/activity', { preHandler: [blockUnauthorized(), adminOnly()] }, ...)` storing under `activities/${safeId}-${Date.now()}.${ext}`.

- [ ] **Step 2: Create `apps/backend/src/__tests__/gallery-activities-api.test.ts`**
  - Test unauthenticated `GET /api/v1/gallery`, `GET /api/v1/gallery?format=grouped` (including `featuredPhoto` selection and fallback), and `GET /api/v1/activities`.
  - Test `401` and `403` enforcement for unauthenticated and non-admin callers on `POST`/`PUT`/`DELETE` and `/api/v1/upload/gallery` & `/api/v1/upload/activity`.
  - Test admin CRUD lifecycle (`201 Created`, `409 Conflict` on duplicate slug ID, `200 OK` update, `200 OK` delete, `404` after delete) and `Cache-Control: private, no-store` when `Authorization` header is present.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend test -- src/__tests__/gallery-activities-api.test.ts
  ```

---

### Task 8: Create Seed Datasets (`data/gallery.json` & `data/activities.json`)

**Files (2):**
- Create: `data/gallery.json`
- Create: `data/activities.json`

- [ ] **Step 1: Create `data/gallery.json` with initial `zenith.csui.dev` gallery items**
  - Include:
    - 4 `photo` items (`foto-angkatan-1` through `foto-angkatan-4`, with `foto-angkatan-4` marked `isFeatured: true`, aspect `'4:3'` / `'16:9'`, and exact Bahasa Indonesia `alt` captions from `zenith.csui.dev`).
    - 2 `hero` items (`racoon-1`, `racoon-2` for *Karakter Zenith* with aspect `'4:7'` and Bahasa Indonesia `alt` captions).
    - 2 `highlight` items (`highlight-1`, `highlight-2` for Beranda *Foto angkatan* with aspect `'4:3'`).

- [ ] **Step 2: Create `data/activities.json` with initial `zenith.csui.dev` activities**
  - Include `ddp0` (`DDP0`), `pkkmb` (`PKKMB`), `psaf` (`PSAF`, `date: "11-13 Agustus 2026"`), and `pmb` (`PMB`) with their exact descriptions and `16:9` image configs.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  node -e "const fs = require('fs'); const g = JSON.parse(fs.readFileSync('data/gallery.json', 'utf8')); const a = JSON.parse(fs.readFileSync('data/activities.json', 'utf8')); if (g.length < 8 || a.length < 4) process.exit(1); console.log('Seed JSON validated:', g.length, a.length);"
  ```

---

### Task 9: Add `seedGallery()` and `seedActivities()` to `apps/backend/src/db/seed.ts`

**Files (1):**
- Modify: `apps/backend/src/db/seed.ts`

- [ ] **Step 1: Update `apps/backend/src/db/seed.ts` to seed `gallery_items` and `activities`**
  - Import `galleryItems, activities` from `./schema.js`.
  - Add `GALLERY_FILE = join(DATA_DIR, 'gallery.json')` and `ACTIVITIES_FILE = join(DATA_DIR, 'activities.json')`.
  - Implement `seedGallery()` and `seedActivities()` using `migrateImageToS3()` (`gallery/${item.id}` and `activities/${item.id}`) and execute them in `main()`.

- [ ] **Step 2: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

---

### Task 10: Extend Frontend `uploadMedia` & `ImageUploadEditor` for Gallery/Activity Endpoints and Aspect Ratios

**Files (2):**
- Modify: `apps/frontend/src/lib/api.ts`
- Modify: `apps/frontend/src/components/patterns/ImageUploadEditor.tsx`

- [ ] **Step 1: Export `UploadEndpoint` type in `apps/frontend/src/lib/api.ts`**
  ```ts
  export type UploadEndpoint =
    | '/upload/avatar'
    | '/upload/achievement'
    | '/upload/gallery'
    | '/upload/activity';
  ```
  - Update `uploadMedia(endpoint: UploadEndpoint, blob: Blob, params?: Record<string, string>)`.

- [ ] **Step 2: Add `defaultAspect?: string` and `UploadEndpoint` support to `apps/frontend/src/components/patterns/ImageUploadEditor.tsx`**
  - Update `ImageUploadEditorProps`:
    - `endpoint: UploadEndpoint;`
    - `defaultAspect?: string;` (defaults to `'1:1'`)
  - Resolve `const resolvedAspect = value.config?.aspect || defaultAspect;` in `activeConfig`, `handleFileChange`, and `handleReset` so `GalleryFormDialog` (`4:3`, `4:7`, `16:9`) and `ActivityFormDialog` (`16:9`) frame and crop images at their target aspect ratio while preserving `1:1` as the default for member avatars.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend test -- src/components/patterns/ImageUploadEditor.test.tsx
  ```

---

### Task 11: Create Frontend Gallery API Client & Form Validation Schema

**Files (2):**
- Create: `apps/frontend/src/features/gallery/api.ts`
- Create: `apps/frontend/src/features/gallery/schema.ts`

- [ ] **Step 1: Create `apps/frontend/src/features/gallery/api.ts`**
  - Export `galleryApi` with `list(params)`, `listGrouped()`, `get(id)`, `create(payload)`, `update(id, payload)`, and `remove(id)`.

- [ ] **Step 2: Create `apps/frontend/src/features/gallery/schema.ts`**
  - Export `defaultAspectForGalleryCategory(category: GalleryCategory, isFeatured: boolean): string` returning `'4:7'` for `'hero'`, `'16:9'` for `'photo'` when `isFeatured === true`, and `'4:3'` otherwise.
  - Export `slugifyGalleryId(title: string): string`.
  - Export `galleryFormSchema`, `GalleryFormValues`, and `toGalleryPayload(values: GalleryFormValues): GalleryItemCreate`.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 12: Create `GalleryFormDialog` & Utilitarian `GalleryPage` Admin View

**Files (2):**
- Create: `apps/frontend/src/features/gallery/GalleryFormDialog.tsx`
- Create: `apps/frontend/src/features/gallery/GalleryPage.tsx`

- [ ] **Step 1: Create `apps/frontend/src/features/gallery/GalleryFormDialog.tsx`**
  - Built on `FormDialog`, `TextField`, `TextAreaField`, `Select` (`photo` / `hero` / `highlight`), featured checkbox, numeric `position` field (`font-mono tabular-nums`), and `ImageUploadEditor` (`endpoint="/upload/gallery"`, `defaultAspect={defaultAspectForGalleryCategory(category, isFeatured)}`).
  - Auto-populates `id` from `title` via `slugifyGalleryId` when creating a new item (locked when editing).
  - Follows `anti-slop` gates (`R-01`–`R-04`): zero em-dashes, direct English labels, explicit `aria-label` attributes.

- [ ] **Step 2: Create `apps/frontend/src/features/gallery/GalleryPage.tsx`**
  - High-density utilitarian admin table built on `PageHeader`, `SearchInput` (`/` shortcut), category `Select` filter (`All categories`, `Cohort Photo`, `Mascot Hero`, `Homepage Highlight`), `ListState`, `Table`, `GalleryFormDialog`, and `ConfirmDialog`.
  - Displays cropped aspect thumbnail preview, title + alt text preview, monospace slug `id`, category badge, featured badge, monospace `position`, and icon-only `Edit` / `Delete` buttons with explicit `aria-label`s.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 13: Create Frontend Activities API Client & Form Validation Schema

**Files (2):**
- Create: `apps/frontend/src/features/activities/api.ts`
- Create: `apps/frontend/src/features/activities/schema.ts`

- [ ] **Step 1: Create `apps/frontend/src/features/activities/api.ts`**
  - Export `activitiesApi` with `list(params)`, `get(id)`, `create(payload)`, `update(id, payload)`, and `remove(id)`.

- [ ] **Step 2: Create `apps/frontend/src/features/activities/schema.ts`**
  - Export `slugifyActivityId(title: string): string`, `activityFormSchema`, `ActivityFormValues`, and `toActivityPayload(values: ActivityFormValues): ActivityCreate` (defaulting `image.config.aspect` to `'16:9'`).

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 14: Create `ActivityFormDialog` & Utilitarian `ActivitiesPage` Admin View

**Files (2):**
- Create: `apps/frontend/src/features/activities/ActivityFormDialog.tsx`
- Create: `apps/frontend/src/features/activities/ActivitiesPage.tsx`

- [ ] **Step 1: Create `apps/frontend/src/features/activities/ActivityFormDialog.tsx`**
  - Built on `FormDialog`, `TextField` (`title`, `id`, optional `date`, `position`), `TextAreaField` (`description`), and `ImageUploadEditor` (`endpoint="/upload/activity"`, `defaultAspect="16:9"`).
  - Auto-populates `id` from `title` when creating a new activity.

- [ ] **Step 2: Create `apps/frontend/src/features/activities/ActivitiesPage.tsx`**
  - Utilitarian admin table built on `PageHeader`, `SearchInput` (`/` shortcut), `ListState`, `Table`, `ActivityFormDialog`, and `ConfirmDialog` (`n` shortcut to add activity).
  - Displays `16:9` thumbnail preview, activity title, monospace slug `id`, optional date pill, truncated description, monospace `position`, and icon-only `Edit` / `Delete` actions with explicit `aria-label`s.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 15: Register `/gallery` and `/activities` Admin Routes in `router.tsx` & `navigation.ts`

**Files (2):**
- Modify: `apps/frontend/src/app/router.tsx`
- Modify: `apps/frontend/src/app/navigation.ts`

- [ ] **Step 1: Register lazy `/gallery` and `/activities` routes inside `AdminRoute` in `apps/frontend/src/app/router.tsx`**
  ```tsx
  const GalleryPage = lazy(() => import('@/features/gallery/GalleryPage'));
  const ActivitiesPage = lazy(() => import('@/features/activities/ActivitiesPage'));
  ```
  - Add `<Route path="gallery" element={<AdminRoute><GalleryPage /></AdminRoute>} />` and `<Route path="activities" element={<AdminRoute><ActivitiesPage /></AdminRoute>} />`.

- [ ] **Step 2: Add `Gallery` and `Activities` items to `apps/frontend/src/app/navigation.ts`**
  - Import `Calendar, Images` from `lucide-react`.
  - Append to `navItems`:
    ```ts
    {
      to: '/gallery',
      label: 'Gallery',
      description: 'Manage cohort photos & mascots',
      icon: Images,
      requireAdmin: true,
    },
    {
      to: '/activities',
      label: 'Activities',
      description: 'Manage cohort activities',
      icon: Calendar,
      requireAdmin: true,
    },
    ```

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run build
  ```

---

### Task 16: Add Frontend Unit Tests for Navigation, `GalleryPage`, and `ActivitiesPage`

**Files (2):**
- Modify: `apps/frontend/src/app/navigation.test.ts`
- Create: `apps/frontend/src/features/gallery/GalleryAndActivitiesPage.test.tsx`

- [ ] **Step 1: Update `apps/frontend/src/app/navigation.test.ts`**
  - Assert `findNavItem('/gallery')?.label === 'Gallery'` (`requireAdmin: true`) and `findNavItem('/activities')?.label === 'Activities'` (`requireAdmin: true`).

- [ ] **Step 2: Create `apps/frontend/src/features/gallery/GalleryAndActivitiesPage.test.tsx`**
  - Test `GalleryPage`: renders table rows from `GET /api/v1/gallery`, filters by category, opens `GalleryFormDialog` on clicking `Add item`, and passes anti-slop copy assertions (zero em-dashes/en-dashes).
  - Test `ActivitiesPage`: renders table rows from `GET /api/v1/activities`, opens `ActivityFormDialog` on clicking `Add activity`, deletes via `ConfirmDialog`, and passes anti-slop copy assertions.

- [ ] **Step 3: Full Monorepo Deterministic Verification**
  ```bash
  pnpm turbo run build lint test
  ```
