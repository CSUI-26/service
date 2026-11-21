# Member Request, Feedback & Help Threads Implementation Plan (`@zenith/shared`, `@zenith/backend`, `@zenith/frontend`)

> **For agentic workers:** Implement this plan task-by-task in sequential order. Every task modifies or creates **at most 2 files** and concludes with an explicit, deterministic verification command. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the private, threaded member request, feedback, and help system specified in [`docs/PRD.md`](file:///home/antigravity/VickyIbr/CSUI26/docs/PRD.md) across `@zenith/shared`, `@zenith/backend`, and `@zenith/frontend`:
1. Shared Zod v4 contracts and DTO types (`RequestCategorySchema`, `RequestContentTypeSchema`, `RequestStatusSchema`, `RequestMetadataSchema`, `RequestThread*Schema`, `RequestMessage*Schema`) in `@zenith/shared`.
2. PostgreSQL tables (`request_threads` and `request_messages`), Drizzle SQL migration (`0004_request_threads.sql`), batch-hydrated repository (`repositories/requests.ts`), private Fastify REST routes (`/api/v1/requests` and `/api/v1/requests/:id/messages`), and member-accessible S3 multipart image upload endpoint (`POST /api/v1/upload/request`) in `@zenith/backend`.
3. Member-facing showcase page (`/requests` inside `ProtectedRoute`) in Bahasa Indonesia with a fun 3-card **Petunjuk** guide, glassmorphic `.surface-card` containers, private thread chat, and full self-service edit/delete over own threads and messages.
4. Utilitarian admin triage page (`/admin/requests` inside `AdminRoute`) in concise English with high-density `Table` filtering (`category`, `status`, `search`), status transitions (`open`, `in_progress`, `resolved`, `closed`), and direct thread replies.

**Tech Stack:** pnpm Workspaces, Turborepo, Fastify v5, Drizzle ORM (`postgres`), PostgreSQL 16, Zod v4, React 19, React Router (`react-router`), Vite, Tailwind CSS v4, `radix-ui`, `shadcn/ui`, `lucide-react`, Vitest, Oxlint.

**References:**
- Product Requirements: [`docs/PRD.md`](file:///home/antigravity/VickyIbr/CSUI26/docs/PRD.md)
- Frontend Visual & Anti-Slop System: [`apps/frontend/DESIGN.md`](file:///home/antigravity/VickyIbr/CSUI26/apps/frontend/DESIGN.md)

---

## Global Principles (`writing-plans`, `ponytail`, `ui-ux-pro-max`, `anti-slop`)

1. **Native Capabilities First (`ponytail`):**
   - Install **zero** new third-party dependencies.
   - Use native Fastify plugins (`@fastify/multipart`), native Drizzle ORM transactions and batch `inArray` hydration, native browser `HTMLCanvasElement` WebP cropping (`ImageUploadEditor` + `renderCroppedWebp`), and existing workspace `shadcn/ui` primitives (`Table`, `Select`, `Dialog`, `Badge`, `Button`, `Input`, `Textarea`).
2. **Design Tokens & Typography Scale (`ui-ux-pro-max` & [`apps/frontend/DESIGN.md`](file:///home/antigravity/VickyIbr/CSUI26/apps/frontend/DESIGN.md)):**
   - **Dark Default (`.dark` — Zenith Obsidian):** `--background: #05060d`, `--foreground: #f8fafc`, `--card: #0c101d` (`rgba(12, 16, 29, 0.85)` glass on `.surface-card`), `--muted: #12182b`, `--muted-foreground: #94a3b8`, `--primary: #3b82f6`, `--border: rgba(255, 255, 255, 0.10)`.
   - **Light Mode (`:root` — Slate High-Contrast):** `--background: #f8fafc`, `--foreground: #0f172a`, `--card: #ffffff`, `--muted: #f1f5f9`, `--muted-foreground: #475569`, `--primary: #2563eb`, `--border: #e2e8f0`.
   - **Typography Scale:**
     - Page Title (`h1` / `PageHeader`): `text-xl sm:text-2xl font-bold tracking-tight` (`Geist Variable`, `--font-heading`)
     - Section / Card / Dialog Title (`h2` / `h3`): `text-sm sm:text-base font-bold`
     - UI Body & Message Bubbles: `text-xs sm:text-sm leading-relaxed` (`Inter`, `--font-sans`)
     - Hint / Caption / Timestamp: `text-xs text-muted-foreground`
     - Thread IDs (`#12`), NPMs, Years & Message Counts: `font-mono tabular-nums text-xs` (`JetBrains Mono`, `--font-mono`)
3. **Anti-Slop Gates ([`miqdadbadjuber/anti-slop`](https://github.com/miqdadbadjuber/anti-slop)):**
   - **R-01 (Purposeful Surfaces):** Use `.surface-card` and `.surface-elevated` glassmorphic cards with the 3-card **Petunjuk** guide on the member-facing `/requests` route; keep `/admin/requests` flat, compact, and scannable using `Table` primitives without decorative banners.
   - **R-02 (Direct, Non-Dev Copywriting):** Zero em-dashes (`—`) or en-dashes (`–`) in UI copy. Zero corporate buzzwords ("seamless", "elevate", "empower", "unlock", "robust"). Reference interactive controls by their exact visible label rather than directional cues ("di kanan", "di atas").
   - **R-03 (Accessible Affordances & Motion):** Every icon-only action button (`Edit`, `Delete`, `Inspect thread`, `Reset filters`) must have an explicit `aria-label`. Interactive controls meet `44x44px` touch targets on mobile. Transitions remain within `150ms–200ms` with `prefers-reduced-motion` safeguards.
   - **R-04 (Code Hygiene):** Zero literal hex colors in `.tsx` files, zero empty `catch` blocks, and zero `window.confirm` calls (always use `ConfirmDialog`).
4. **Atomic Sequential Execution (Max 2 Files per Task):**
   - Each task below modifies or creates **at most 2 files** and includes a deterministic verification command.

---

## File Map

- **Modify:**
  - `packages/shared/src/index.ts` — Add `RequestCategorySchema`, `RequestContentTypeSchema`, `RequestStatusSchema`, `RequestMetadataSchema`, `RequestAuthorSchema`, `RequestMessage*Schema`, `RequestThread*Schema`, and exported TypeScript DTO types.
  - `apps/backend/src/db/schema.ts` — Add `requestThreads` (`request_threads`), `requestMessages` (`request_messages`), and Drizzle relations.
  - `apps/backend/drizzle/meta/_journal.json` — Register migration `0004_request_threads`.
  - `apps/backend/src/db/repository.ts` — Re-export `repositories/requests.js`.
  - `apps/backend/src/routes/upload.ts` — Add `POST /api/v1/upload/request` protected by `blockUnauthorized()` + `requireWhitelisted()`.
  - `apps/backend/src/app.ts` — Register `requestRoutes`.
  - `apps/frontend/src/lib/api.ts` — Extend `UploadEndpoint` union with `'/upload/request'`.
  - `apps/frontend/src/app/router.tsx` — Register `/requests` inside `ProtectedRoute` and `/admin/requests` inside `AdminRoute`.
  - `apps/frontend/src/app/navigation.ts` — Add `Aspirasi & Request` (`/requests`) for all members and `Requests (Admin)` (`/admin/requests`) for admins.
  - `apps/frontend/src/app/navigation.test.ts` — Add route matching assertions for `/requests` and `/admin/requests`.
- **Create:**
  - `apps/backend/drizzle/0004_request_threads.sql` — SQL DDL for `request_threads`, `request_messages`, foreign keys, and indexes.
  - `apps/backend/src/__tests__/requests-schema.test.ts` — Unit tests for Request Zod schemas and Drizzle table columns.
  - `apps/backend/src/db/repositories/requests.ts` — Thread & message CRUD with batch `inArray` author hydration and message count aggregation.
  - `apps/backend/src/routes/requests.ts` — Fastify routes for `/api/v1/requests`, `/api/v1/requests/:id`, and `/api/v1/requests/:id/messages/:messageId?`.
  - `apps/backend/src/__tests__/requests-api.test.ts` — Integration tests for thread isolation (`401`/`403`), status transitions, closed-thread reply guards, member full edit/delete permissions, and `/api/v1/upload/request`.
  - `apps/frontend/src/features/requests/api.ts` — Frontend API client, category/status labels, and helper formatters for requests.
  - `apps/frontend/src/features/requests/RequestFormDialog.tsx` — Modal dialog for creating and editing a request thread (including dynamic `'content'` metadata fields and `ImageUploadEditor`).
  - `apps/frontend/src/features/requests/RequestThreadDialog.tsx` — Interactive thread conversation dialog supporting message replies, optional image upload, inline message edit/delete, and thread status actions.
  - `apps/frontend/src/features/requests/MemberRequestsPage.tsx` — Member-facing `/requests` page in Bahasa Indonesia with the fun 3-card **Petunjuk** guide, category pills, and thread cards.
  - `apps/frontend/src/features/requests/AdminRequestsPage.tsx` — Admin-facing `/admin/requests` page in English with high-density `Table`, `SearchInput`, category/status `Select` filters, and `Paginator`.
  - `apps/frontend/src/features/requests/RequestsPages.test.tsx` — Component and anti-slop unit tests for `MemberRequestsPage` and `AdminRequestsPage`.

---

### Task 1: Add Request Thread & Message Zod Schemas and DTO Types to `@zenith/shared`

**Files (1):**
- Modify: `packages/shared/src/index.ts`

- [x] **Step 1: Define Request schemas and export inferred types in `packages/shared/src/index.ts`**
  - Append the following schemas before the `// Types` section:
    ```ts
    // Request Thread & Message schemas
    export const RequestCategorySchema = z.enum(['content', 'feedback', 'help', 'other']);
    export const RequestContentTypeSchema = z.enum(['achievement', 'gallery', 'activity', 'other']);
    export const RequestStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);

    export const RequestMetadataSchema = z.object({
      contentType: RequestContentTypeSchema.optional(),
      externalUrl: z.string().url().optional().or(z.literal('')),
      year: z.number().int().min(1990).max(2100).optional(),
      teamName: z.string().optional(),
    });

    export const RequestAuthorSchema = z.object({
      npm: z.string(),
      name: z.string(),
      nama_panggilan: z.string(),
      foto: ImageFieldSchema.optional(),
    });

    export const RequestMessageSchema = z.object({
      id: z.number().int().positive(),
      threadId: z.number().int().positive(),
      authorNpm: z.string(),
      authorRole: z.enum(['user', 'admin']),
      author: RequestAuthorSchema.optional(),
      body: z.string().min(1, 'Message body required'),
      image: ImageFieldSchema.nullable().optional(),
      createdAt: z.number().int(),
      updatedAt: z.number().int(),
    });

    export const RequestMessageCreateSchema = z.object({
      body: z.string().trim().min(1, 'Message body required').max(4000),
      image: ImageFieldSchema.nullable().optional(),
    });

    export const RequestMessageUpdateSchema = z
      .object({
        body: z.string().trim().min(1, 'Message body required').max(4000),
        image: ImageFieldSchema.nullable(),
      })
      .partial()
      .refine((data) => data.body !== undefined || data.image !== undefined, {
        message: 'At least one field (body or image) must be provided',
      });

    export const RequestThreadSummarySchema = z.object({
      id: z.number().int().positive(),
      authorNpm: z.string(),
      author: RequestAuthorSchema.optional(),
      category: RequestCategorySchema,
      title: z.string().min(1, 'Title required'),
      description: z.string().min(1, 'Description required'),
      status: RequestStatusSchema,
      image: ImageFieldSchema.nullable().optional(),
      metadata: RequestMetadataSchema,
      messageCount: z.number().int().min(0),
      createdAt: z.number().int(),
      updatedAt: z.number().int(),
    });

    export const RequestThreadDetailSchema = RequestThreadSummarySchema.extend({
      messages: z.array(RequestMessageSchema),
    });

    export const RequestThreadCreateSchema = z.object({
      category: RequestCategorySchema.default('content'),
      title: z.string().trim().min(1, 'Title required').max(200),
      description: z.string().trim().min(1, 'Description required').max(5000),
      image: ImageFieldSchema.nullable().optional(),
      metadata: RequestMetadataSchema.optional().default({}),
    });

    export const RequestThreadUpdateSchema = z
      .object({
        category: RequestCategorySchema,
        title: z.string().trim().min(1, 'Title required').max(200),
        description: z.string().trim().min(1, 'Description required').max(5000),
        status: RequestStatusSchema,
        image: ImageFieldSchema.nullable(),
        metadata: RequestMetadataSchema,
      })
      .partial();
    ```
  - Export inferred TypeScript types:
    ```ts
    export type RequestCategory = z.infer<typeof RequestCategorySchema>;
    export type RequestContentType = z.infer<typeof RequestContentTypeSchema>;
    export type RequestStatus = z.infer<typeof RequestStatusSchema>;
    export type RequestMetadata = z.infer<typeof RequestMetadataSchema>;
    export type RequestAuthor = z.infer<typeof RequestAuthorSchema>;
    export type RequestMessage = z.infer<typeof RequestMessageSchema>;
    export type RequestMessageCreate = z.infer<typeof RequestMessageCreateSchema>;
    export type RequestMessageUpdate = z.infer<typeof RequestMessageUpdateSchema>;
    export type RequestThreadSummary = z.infer<typeof RequestThreadSummarySchema>;
    export type RequestThreadDetail = z.infer<typeof RequestThreadDetailSchema>;
    export type RequestThreadCreate = z.infer<typeof RequestThreadCreateSchema>;
    export type RequestThreadUpdate = z.infer<typeof RequestThreadUpdateSchema>;
    ```

- [x] **Step 2: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/shared run build && pnpm --filter @zenith/shared run lint
  ```

---

### Task 2: Add `request_threads` and `request_messages` Tables & Relations to Drizzle Schema and SQL Migration

**Files (2):**
- Modify: `apps/backend/src/db/schema.ts`
- Create: `apps/backend/drizzle/0004_request_threads.sql`

- [x] **Step 1: Add `requestThreads`, `requestMessages`, and Drizzle relations to `apps/backend/src/db/schema.ts`**
  - Import `RequestMetadata` from `@zenith/shared`:
    ```ts
    import type { ImageConfig, RequestMetadata } from '@zenith/shared';
    ```
  - Define `requestThreads` and `requestMessages`:
    ```ts
    export const requestThreads = pgTable('request_threads', {
      id: serial('id').primaryKey(),
      authorNpm: text('author_npm').notNull().references(() => members.npm, { onDelete: 'cascade' }),
      category: text('category').notNull().default('content'),
      title: text('title').notNull(),
      description: text('description').notNull(),
      status: text('status').notNull().default('open'),
      image: jsonb('image').$type<{ url: string; config?: ImageConfig } | null>(),
      metadata: jsonb('metadata').$type<RequestMetadata>().notNull().default(sql`'{}'::jsonb`),
      createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
      updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
    }, (table) => ({
      authorIdx: index('idx_request_threads_author').on(table.authorNpm),
      statusIdx: index('idx_request_threads_status').on(table.status),
      categoryIdx: index('idx_request_threads_category').on(table.category),
      updatedAtIdx: index('idx_request_threads_updated_at').on(table.updatedAt),
    }));

    export const requestMessages = pgTable('request_messages', {
      id: serial('id').primaryKey(),
      threadId: integer('thread_id').notNull().references(() => requestThreads.id, { onDelete: 'cascade' }),
      authorNpm: text('author_npm').notNull().references(() => members.npm, { onDelete: 'cascade' }),
      authorRole: text('author_role').notNull().default('user'),
      body: text('body').notNull(),
      image: jsonb('image').$type<{ url: string; config?: ImageConfig } | null>(),
      createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
      updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
    }, (table) => ({
      threadIdx: index('idx_request_messages_thread').on(table.threadId, table.createdAt),
      authorIdx: index('idx_request_messages_author').on(table.authorNpm),
    }));
    ```
  - Add relations `requestThreadsRelations` and `requestMessagesRelations`.

- [x] **Step 2: Create SQL migration `apps/backend/drizzle/0004_request_threads.sql`**
  ```sql
  CREATE TABLE IF NOT EXISTS "request_threads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"author_npm" text NOT NULL,
  	"category" text DEFAULT 'content' NOT NULL,
  	"title" text NOT NULL,
  	"description" text NOT NULL,
  	"status" text DEFAULT 'open' NOT NULL,
  	"image" jsonb,
  	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  	"created_at" integer DEFAULT extract(epoch from now())::int NOT NULL,
  	"updated_at" integer DEFAULT extract(epoch from now())::int NOT NULL
  );
  --> statement-breakpoint
  CREATE TABLE IF NOT EXISTS "request_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"thread_id" integer NOT NULL,
  	"author_npm" text NOT NULL,
  	"author_role" text DEFAULT 'user' NOT NULL,
  	"body" text NOT NULL,
  	"image" jsonb,
  	"created_at" integer DEFAULT extract(epoch from now())::int NOT NULL,
  	"updated_at" integer DEFAULT extract(epoch from now())::int NOT NULL
  );
  --> statement-breakpoint
  DO $$ BEGIN
   ALTER TABLE "request_threads" ADD CONSTRAINT "request_threads_author_npm_members_npm_fk" FOREIGN KEY ("author_npm") REFERENCES "public"."members"("npm") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  --> statement-breakpoint
  DO $$ BEGIN
   ALTER TABLE "request_messages" ADD CONSTRAINT "request_messages_thread_id_request_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."request_threads"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  --> statement-breakpoint
  DO $$ BEGIN
   ALTER TABLE "request_messages" ADD CONSTRAINT "request_messages_author_npm_members_npm_fk" FOREIGN KEY ("author_npm") REFERENCES "public"."members"("npm") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  --> statement-breakpoint
  CREATE INDEX IF NOT EXISTS "idx_request_threads_author" ON "request_threads" USING btree ("author_npm");--> statement-breakpoint
  CREATE INDEX IF NOT EXISTS "idx_request_threads_status" ON "request_threads" USING btree ("status");--> statement-breakpoint
  CREATE INDEX IF NOT EXISTS "idx_request_threads_category" ON "request_threads" USING btree ("category");--> statement-breakpoint
  CREATE INDEX IF NOT EXISTS "idx_request_threads_updated_at" ON "request_threads" USING btree ("updated_at");--> statement-breakpoint
  CREATE INDEX IF NOT EXISTS "idx_request_messages_thread" ON "request_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
  CREATE INDEX IF NOT EXISTS "idx_request_messages_author" ON "request_messages" USING btree ("author_npm");
  ```

- [x] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

---

### Task 3: Register `0004_request_threads` in Drizzle Journal and Add Schema Unit Tests

**Files (2):**
- Modify: `apps/backend/drizzle/meta/_journal.json`
- Create: `apps/backend/src/__tests__/requests-schema.test.ts`

- [x] **Step 1: Append entry `idx: 4` (`0004_request_threads`) to `apps/backend/drizzle/meta/_journal.json`**
  ```json
    {
      "idx": 4,
      "version": "7",
      "when": 1796000000000,
      "tag": "0004_request_threads",
      "breakpoints": true
    }
  ```

- [x] **Step 2: Create unit tests in `apps/backend/src/__tests__/requests-schema.test.ts`**
  - Verify `RequestThreadCreateSchema` defaults (`category: 'content'`, `metadata: {}`), rejects blank titles/descriptions, and validates `metadata.contentType` (`'achievement' | 'gallery' | 'activity' | 'other'`).
  - Verify `RequestThreadUpdateSchema` partial updates and `RequestStatusSchema` enum values (`'open' | 'in_progress' | 'resolved' | 'closed'`).
  - Verify `RequestMessageCreateSchema` and `RequestMessageUpdateSchema` validation (rejecting empty update objects when neither `body` nor `image` is provided).
  - Verify `getTableColumns(requestThreads)` and `getTableColumns(requestMessages)` column names and snake_case mappings (`author_npm`, `thread_id`, `author_role`, `created_at`, `updated_at`).

- [x] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend exec vitest run src/__tests__/requests-schema.test.ts
  ```

---

### Task 4: Implement Requests Repository (`apps/backend/src/db/repositories/requests.ts`) and Re-export in `repository.ts`

**Files (2):**
- Create: `apps/backend/src/db/repositories/requests.ts`
- Modify: `apps/backend/src/db/repository.ts`

- [x] **Step 1: Implement `apps/backend/src/db/repositories/requests.ts` without N+1 queries**
  - Batch-hydrate author summaries (`npm`, `name`, `nama_panggilan`, `foto`) from `members` via `inArray(members.npm, uniqueNpms)` and message counts via `sql<number>\`count(*)::int\`` grouped by `requestMessages.threadId`.
  - Provide functions:
    - `getRequestThreads(options?: { authorNpm?: string; category?: RequestCategory; status?: RequestStatus; search?: string; page?: number; limit?: number }): Promise<{ data: RequestThreadSummary[]; total: number; page: number; limit: number; totalPages: number }>` ordered by `desc(requestThreads.updatedAt), desc(requestThreads.id)`.
    - `getRequestThreadById(id: number): Promise<RequestThreadDetail | undefined>` returning hydrated thread summary + chronological `messages` (`asc(requestMessages.createdAt), asc(requestMessages.id)`) with each message's `author` hydrated.
    - `createRequestThread(authorNpm: string, data: RequestThreadCreate): Promise<RequestThreadDetail>`
    - `updateRequestThread(id: number, data: RequestThreadUpdate): Promise<RequestThreadDetail | undefined>` (bumping `updatedAt`).
    - `deleteRequestThread(id: number): Promise<boolean>`
    - `getRequestMessageById(messageId: number): Promise<RequestMessage | undefined>`
    - `createRequestMessage(threadId: number, authorNpm: string, authorRole: 'user' | 'admin', data: RequestMessageCreate): Promise<RequestMessage>` inside `db.transaction()` (inserts into `request_messages` and bumps parent `request_threads.updatedAt`).
    - `updateRequestMessage(threadId: number, messageId: number, data: RequestMessageUpdate): Promise<RequestMessage | undefined>` inside `db.transaction()` (verifies `threadId` match, updates `request_messages.updatedAt` and parent `request_threads.updatedAt`).
    - `deleteRequestMessage(threadId: number, messageId: number): Promise<boolean>`

- [x] **Step 2: Re-export `repositories/requests.js` in `apps/backend/src/db/repository.ts`**
  ```ts
  export * from './repositories/requests.js';
  ```

- [x] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

---

### Task 5: Implement Requests REST Routes (`apps/backend/src/routes/requests.ts`) and `POST /api/v1/upload/request`

**Files (2):**
- Create: `apps/backend/src/routes/requests.ts`
- Modify: `apps/backend/src/routes/upload.ts`

- [x] **Step 1: Create `apps/backend/src/routes/requests.ts`**
  - Apply `preHandler: [blockUnauthorized(), requireWhitelisted()]` and `reply.header('Cache-Control', 'private, no-store')` across all routes:
    - `GET /api/v1/requests`:
      - Parse query `{ category?, status?, search?, scope?, page?, limit? }`.
      - If `!req.user?.isAdmin` or `scope === 'mine'`, enforce `authorNpm = req.user!.npm!`.
    - `POST /api/v1/requests`:
      - Parse body with `RequestThreadCreateSchema.parse(req.body)`.
      - Create thread for `req.user!.npm!` and return `201 Created` `{ data: created }`.
    - `GET /api/v1/requests/:id`:
      - Validate positive integer `:id`. Fetch via `repo.getRequestThreadById(id)`. Return `404` if missing.
      - If `!req.user?.isAdmin && thread.authorNpm !== req.user?.npm`, return `403 Forbidden`.
    - `PUT /api/v1/requests/:id`:
      - Fetch thread (`404` if missing). Check `req.user?.isAdmin || thread.authorNpm === req.user?.npm` (`403` otherwise).
      - Parse body with `RequestThreadUpdateSchema.parse(req.body)`.
      - If `!req.user?.isAdmin && body.status !== undefined && body.status !== 'closed'`, return `403 Forbidden` (`{ error: 'Forbidden: members can only close their own threads' }`).
    - `DELETE /api/v1/requests/:id`:
      - Fetch thread (`404` if missing). Check `req.user?.isAdmin || thread.authorNpm === req.user?.npm` (`403` otherwise).
      - Call `repo.deleteRequestThread(id)` and return `{ data: { id } }`.
    - `POST /api/v1/requests/:id/messages`:
      - Fetch thread (`404` if missing). Check `req.user?.isAdmin || thread.authorNpm === req.user?.npm` (`403` otherwise).
      - If `!req.user?.isAdmin && (thread.status === 'resolved' || thread.status === 'closed')`, return `400 Bad Request` (`{ error: 'Thread is closed for new replies' }`).
      - Parse body with `RequestMessageCreateSchema.parse(req.body)`.
      - Call `repo.createRequestMessage(id, req.user!.npm!, req.user?.isAdmin ? 'admin' : 'user', body)` and return `201 Created` `{ data: message }`.
    - `PUT /api/v1/requests/:id/messages/:messageId`:
      - Fetch thread (`404` if missing) and message (`404` if missing or `message.threadId !== id`).
      - Check `req.user?.isAdmin || message.authorNpm === req.user?.npm` (`403` otherwise).
      - Parse body with `RequestMessageUpdateSchema.parse(req.body)`.
      - Call `repo.updateRequestMessage(id, messageId, body)` and return `200 OK` `{ data: updated }`.
    - `DELETE /api/v1/requests/:id/messages/:messageId`:
      - Fetch thread (`404` if missing) and message (`404` if missing or `message.threadId !== id`).
      - Check `req.user?.isAdmin || message.authorNpm === req.user?.npm` (`403` otherwise).
      - Call `repo.deleteRequestMessage(id, messageId)` and return `200 OK` `{ data: { id: messageId } }`.

- [x] **Step 2: Add `POST /api/v1/upload/request` to `apps/backend/src/routes/upload.ts`**
  ```ts
  fastify.post(
    '/api/v1/upload/request',
    { preHandler: [blockUnauthorized(), requireWhitelisted()] },
    async (req, reply) => {
      const callerNpm = req.user?.npm || 'member';
      return handleImageUpload(req, reply, (ext) => `requests/${callerNpm}-${randomUUID()}.${ext}`);
    },
  );
  ```

- [x] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

---

### Task 6: Register `requestRoutes` in `apps/backend/src/app.ts` and Add Backend API Integration Tests

**Files (2):**
- Modify: `apps/backend/src/app.ts`
- Create: `apps/backend/src/__tests__/requests-api.test.ts`

- [x] **Step 1: Register `requestRoutes` in `apps/backend/src/app.ts`**
  - Import `{ requestRoutes } from './routes/requests.js'` and call `fastify.register(requestRoutes)`.

- [x] **Step 2: Create integration test suite `apps/backend/src/__tests__/requests-api.test.ts`**
  - Test `401 Unauthorized` for unauthenticated callers and `403 Forbidden` for non-whitelisted tokens on `/api/v1/requests` and `/api/v1/upload/request`.
  - Test member creating a `'content'` request thread (`metadata.contentType = 'achievement'`), verifying `author` hydration and `Cache-Control: private, no-store`.
  - Test strict private thread isolation: a second whitelisted non-admin member (`memberTwo`) cannot see `memberOne`'s thread in `GET /api/v1/requests`, cannot view `GET /api/v1/requests/:id` (`403`), cannot reply (`403`), and cannot edit/delete (`403`).
  - Test full edit & delete permissions for members on their own threads and messages (`PUT /api/v1/requests/:id`, `PUT /api/v1/requests/:id/messages/:messageId`, `DELETE /api/v1/requests/:id/messages/:messageId`, `DELETE /api/v1/requests/:id`).
  - Test status lifecycle and reply guards: non-admin member cannot set status to `'in_progress'` or `'resolved'` (`403`), admin can transition status to `'in_progress'` and `'resolved'`, non-admin cannot post a new reply while `'resolved'` (`400`), admin can still reply while `'resolved'`, and member can still edit/delete their own messages at any time.
  - Test `POST /api/v1/upload/request` by a whitelisted non-admin member with a valid 1x1 WebP buffer.

- [x] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/backend run db:migrate && pnpm --filter @zenith/backend exec vitest run src/__tests__/requests-api.test.ts
  ```

---

### Task 7: Extend Frontend Upload Endpoint Union (`lib/api.ts`) and Create Requests API Client (`features/requests/api.ts`)

**Files (2):**
- Modify: `apps/frontend/src/lib/api.ts`
- Create: `apps/frontend/src/features/requests/api.ts`

- [x] **Step 1: Add `'/upload/request'` to `UploadEndpoint` in `apps/frontend/src/lib/api.ts`**
  ```ts
  export type UploadEndpoint =
    | '/upload/avatar'
    | '/upload/achievement'
    | '/upload/gallery'
    | '/upload/activity'
    | '/upload/request';
  ```

- [x] **Step 2: Create `apps/frontend/src/features/requests/api.ts`**
  - Define typed REST methods wrapping `api()` from `@/lib/api`:
    - `requestsApi.list(params?: { category?: RequestCategory; status?: RequestStatus; search?: string; scope?: 'mine' | 'all'; page?: number; limit?: number })`
    - `requestsApi.get(id: number)`
    - `requestsApi.create(payload: RequestThreadCreate)`
    - `requestsApi.update(id: number, payload: RequestThreadUpdate)`
    - `requestsApi.remove(id: number)`
    - `requestsApi.createMessage(threadId: number, payload: RequestMessageCreate)`
    - `requestsApi.updateMessage(threadId: number, messageId: number, payload: RequestMessageUpdate)`
    - `requestsApi.removeMessage(threadId: number, messageId: number)`
  - Export bilingual label & badge helpers (Bahasa Indonesia for `/requests` member view, English for `/admin/requests` admin table) with zero em-dashes or en-dashes.

- [x] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 8: Create Request Creation/Edit Form Dialog and Thread Chat/Detail Dialog (`features/requests/`)

**Files (2):**
- Create: `apps/frontend/src/features/requests/RequestFormDialog.tsx`
- Create: `apps/frontend/src/features/requests/RequestThreadDialog.tsx`

- [x] **Step 1: Build `apps/frontend/src/features/requests/RequestFormDialog.tsx`**
  - Supports creating a new request thread or editing an existing thread (`mode: 'member' | 'admin'`).
  - Fields:
    - Category `Select` (`Request Konten`, `Feedback`, `Bantuan`, `Lainnya` in member mode; English labels in admin mode).
    - When `category === 'content'`, render dynamic helper fields for `metadata.contentType` (`Achievement`, `Galeri`, `Kegiatan`, `Lainnya`), `metadata.year`, `metadata.teamName`, and `metadata.externalUrl`.
    - When `category !== 'content'`, render optional `metadata.externalUrl` reference link input.
    - Title (`Input`), Description (`Textarea`), and optional image attachment via `ImageUploadEditor` (`endpoint="/upload/request"`, `defaultAspect="16:9"`).

- [x] **Step 2: Build `apps/frontend/src/features/requests/RequestThreadDialog.tsx`**
  - Displays the full private thread conversation (`RequestThreadDetail`):
    - Opening request header with category badge, content-type sub-badge, status badge, author display (`name` + `npm` in `font-mono`), description, optional metadata hints, and optional attached image.
    - Thread actions:
      - Author or Admin can edit thread details (opens `RequestFormDialog`) or delete the thread via `ConfirmDialog`.
      - Author can close an `'open'` or `'in_progress'` thread (`Tutup Thread`).
      - Admin can transition thread status across `Open`, `In Progress`, `Resolved`, and `Closed` via a `Select` control.
    - Chronological message list (`request_messages`):
      - Renders sender name, role badge (`Admin` badge for `authorRole === 'admin'`), timestamp, message body, and optional image attachment.
      - If `message.authorNpm === currentUser.npm` or `currentUser.isAdmin`, renders inline `Edit` and `Delete` action buttons (with explicit `aria-label` attributes and `ConfirmDialog` for deletion).
    - Reply composer at the bottom:
      - Enabled for admins at all statuses, and for the member author when status is `'open'` or `'in_progress'`.
      - Shows a clear notice when locked for new member replies (`Thread ini sudah selesai atau ditutup. Kamu tetap bisa mengedit atau menghapus pesanmu.`).
      - Supports message text and an optional collapsible image attachment (`ImageUploadEditor` targeting `/upload/request`).

- [x] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 9: Create Member Showcase Requests Page (`/requests`) and Admin Triage Page (`/admin/requests`)

**Files (2):**
- Create: `apps/frontend/src/features/requests/MemberRequestsPage.tsx`
- Create: `apps/frontend/src/features/requests/AdminRequestsPage.tsx`

- [x] **Step 1: Build `apps/frontend/src/features/requests/MemberRequestsPage.tsx`**
  - Follows [`apps/frontend/DESIGN.md`](file:///home/antigravity/VickyIbr/CSUI26/apps/frontend/DESIGN.md) member showcase aesthetic (`.surface-card`, Bahasa Indonesia copy, zero em-dashes/en-dashes).
  - Header with title `Kotak Aspirasi & Request`, subtitle `Ajukan request konten, kirim masukan, atau minta bantuan langsung ke admin Zenith.`, and primary CTA button `Buat Request Baru`.
  - Fun 3-Card **Petunjuk** section (`grid gap-3 sm:grid-cols-3`):
    1. `1. Pilih Kategori yang Pas`: Mau ajukan Achievement, foto Galeri, atau Kegiatan baru? Pilih kategori **Request Konten**. Punya ide seru atau butuh pertolongan? Pilih **Feedback** atau **Bantuan**.
    2. `2. Lampirkan Foto & Info Pendukung`: Kalau kamu request konten, unggah foto terbaiknya dan isi detail tambahan seperti jenis konten atau link referensi supaya admin cepat memprosesnya.
    3. `3. Diskusi Privat Bareng Admin`: Thread ini cuma bisa dibaca oleh kamu dan admin Zenith. Kamu bebas balas pesan, ubah isi request, atau hapus pesanmu kapan saja.
  - Category filter pills (`Semua`, `Request Konten`, `Feedback`, `Bantuan`, `Lainnya`) and status filter `Select`.
  - Grid/list of the member's own threads (`scope: 'mine'`) rendered via `ListState`, showing category badge, status badge, title, description snippet, message count (`font-mono tabular-nums`), updated date, and quick actions to open the thread conversation (`Buka Diskusi`), edit (`Ubah`), or delete (`Hapus` via `ConfirmDialog`).

- [x] **Step 2: Build `apps/frontend/src/features/requests/AdminRequestsPage.tsx`**
  - Follows [`apps/frontend/DESIGN.md`](file:///home/antigravity/VickyIbr/CSUI26/apps/frontend/DESIGN.md) utilitarian admin table aesthetic (concise English copy, zero em-dashes/en-dashes, no decorative banners).
  - `PageHeader` with title `Member Requests`, description `Triage content requests, feedback, and private support threads.`, and `New request` CTA (`n` keyboard shortcut).
  - Filter bar with `SearchInput` (`/` shortcut to focus), category `Select` (`All Categories`, `Request for Content`, `Feedback`, `Help`, `Other`), status `Select` (`All Statuses`, `Open`, `In Progress`, `Resolved`, `Closed`), and `Reset filters` icon button.
  - High-density `Table` (`ListState` + `Paginator`) with columns:
    - `ID` (`#id` in `font-mono tabular-nums`)
    - `Member` (author name + `npm` in `font-mono`)
    - `Category` (category badge + optional `contentType` badge)
    - `Subject` (title + description preview)
    - `Status` (status badge)
    - `Replies` (`messageCount` in `font-mono tabular-nums`)
    - `Actions` (`Inspect thread` and `Delete` icon buttons with explicit `aria-label`s).

- [x] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 10: Register `/requests` and `/admin/requests` Routes in `router.tsx` and Navigation Items in `navigation.ts`

**Files (2):**
- Modify: `apps/frontend/src/app/router.tsx`
- Modify: `apps/frontend/src/app/navigation.ts`

- [x] **Step 1: Register lazy-loaded routes in `apps/frontend/src/app/router.tsx`**
  - Add lazy imports:
    ```ts
    const MemberRequestsPage = lazy(() => import('@/features/requests/MemberRequestsPage'));
    const AdminRequestsPage = lazy(() => import('@/features/requests/AdminRequestsPage'));
    ```
  - Inside `<ProtectedRoute><AppLayout /></ProtectedRoute>`, add:
    ```tsx
    <Route path="requests" element={<MemberRequestsPage />} />
    <Route path="admin/requests" element={<AdminRoute><AdminRequestsPage /></AdminRoute>} />
    ```

- [x] **Step 2: Add member and admin navigation items in `apps/frontend/src/app/navigation.ts`**
  - Import `Inbox` and `MessageSquarePlus` from `lucide-react`.
  - Add member item after `/directory`:
    ```ts
    {
      to: '/requests',
      label: 'Aspirasi & Request',
      description: 'Usul konten, feedback & bantuan',
      icon: MessageSquarePlus,
      end: true,
    },
    ```
  - Add admin item after `/activities`:
    ```ts
    {
      to: '/admin/requests',
      label: 'Requests (Admin)',
      description: 'Triage member requests & threads',
      icon: Inbox,
      requireAdmin: true,
    },
    ```

- [x] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run build && pnpm --filter @zenith/frontend run lint
  ```

---

### Task 11: Update Navigation Unit Tests and Add Frontend Component & Anti-Slop Tests for Request Pages

**Files (2):**
- Modify: `apps/frontend/src/app/navigation.test.ts`
- Create: `apps/frontend/src/features/requests/RequestsPages.test.tsx`

- [x] **Step 1: Add `/requests` and `/admin/requests` assertions in `apps/frontend/src/app/navigation.test.ts`**
  - Verify `findNavItem('/requests')` resolves to `Aspirasi & Request` (`requireAdmin` undefined/false).
  - Verify `findNavItem('/admin/requests')` resolves to `Requests (Admin)` (`requireAdmin: true`).

- [x] **Step 2: Create `apps/frontend/src/features/requests/RequestsPages.test.tsx`**
  - Test `MemberRequestsPage`:
    - Renders the 3-card **Petunjuk** section (`1. Pilih Kategori yang Pas`, `2. Lampirkan Foto & Info Pendukung`, `3. Diskusi Privat Bareng Admin`).
    - Renders the member's own request threads, opens the `Buat Request Baru` dialog, opens the thread conversation dialog (`RequestThreadDialog`), allows editing/deleting a message and thread, and passes anti-slop checks (zero `—` or `–`, all buttons have accessible names).
  - Test `AdminRequestsPage`:
    - Renders the high-density admin table with thread `#id`, author NPM, category/content-type badges, status badge, and reply count.
    - Opens the thread inspection dialog to post an admin reply and update status, and passes anti-slop checks.

- [x] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend test && pnpm turbo run build lint
  ```
