# PRD: Member Request, Feedback & Help Threads (`@zenith/shared`, `@zenith/backend`, `@zenith/frontend`)

## 1. Objective & Context

Build a private, threaded communication and submission system inside CSUI Zenith (`zenith.csui.dev`) where whitelisted cohort members can:

1. **Request Content (`content`):** Submit all-in-one content requests (new Achievements, Gallery photos, Activities, or showcase updates) with optional structured hints and image attachments.
2. **Share Feedback (`feedback`):** Provide suggestions, bug reports, or ideas for Zenith.
3. **Ask for Help (`help`) or Other Issues (`other`):** Open a direct support thread with cohort admins for profile, account, or general cohort questions.

Each request functions as a **private discussion thread** visible strictly to the **thread creator (`authorNpm`)** and **Zenith admins (`isAdmin`)**. The frontend provides two purposeful experiences aligned with `apps/frontend/DESIGN.md`:
- A member-facing showcase view (`/requests`) in Bahasa Indonesia with a fun, helpful 3-card **Petunjuk** onboarding guide and full self-service CRUD over the member's own threads and messages.
- An admin triage backoffice (`/admin/requests`) in concise English with high-density table filtering, status management, and direct thread replies.

---

## 2. Data Model & Contracts

### 2.1 PostgreSQL Schema (`apps/backend/src/db/schema.ts`)

#### Table: `request_threads`

| Column | Type | Constraints / Defaults | Description |
| --- | --- | --- | --- |
| `id` | `serial('id')` | `PRIMARY KEY` | Auto-incrementing thread identifier |
| `author_npm` | `text('author_npm')` | `NOT NULL REFERENCES members(npm) ON DELETE CASCADE` | NPM of the whitelisted member who created the thread |
| `category` | `text('category')` | `NOT NULL DEFAULT 'content'` | Enum discriminator: `'content' \| 'feedback' \| 'help' \| 'other'` |
| `title` | `text('title')` | `NOT NULL` | Concise thread subject |
| `description` | `text('description')` | `NOT NULL` | Initial opening description / body of the request |
| `status` | `text('status')` | `NOT NULL DEFAULT 'open'` | Lifecycle state: `'open' \| 'in_progress' \| 'resolved' \| 'closed'` |
| `image` | `jsonb('image')` | Nullable | Optional attachment: `{ url: string; config?: ImageConfig } \| null` |
| `metadata` | `jsonb('metadata')` | `NOT NULL DEFAULT '{}'::jsonb` | Optional flexible hints: `{ contentType?: 'achievement' \| 'gallery' \| 'activity' \| 'other'; externalUrl?: string; year?: number; teamName?: string }` |
| `created_at` | `integer('created_at')` | `NOT NULL DEFAULT extract(epoch from now())::int` | Unix epoch timestamp (seconds) |
| `updated_at` | `integer('updated_at')` | `NOT NULL DEFAULT extract(epoch from now())::int` | Unix epoch timestamp (seconds), bumped on thread edit, status change, or new reply |

- **Indexes:**
  - `idx_request_threads_author` on `(author_npm)`
  - `idx_request_threads_status` on `(status)`
  - `idx_request_threads_category` on `(category)`
  - `idx_request_threads_updated_at` on `(updated_at)`

#### Table: `request_messages`

| Column | Type | Constraints / Defaults | Description |
| --- | --- | --- | --- |
| `id` | `serial('id')` | `PRIMARY KEY` | Auto-incrementing message identifier |
| `thread_id` | `integer('thread_id')` | `NOT NULL REFERENCES request_threads(id) ON DELETE CASCADE` | Parent thread reference |
| `author_npm` | `text('author_npm')` | `NOT NULL REFERENCES members(npm) ON DELETE CASCADE` | NPM of the message sender (member or admin) |
| `author_role` | `text('author_role')` | `NOT NULL DEFAULT 'user'` | Snapshot of sender role at post time (`'user' \| 'admin'`) for badge rendering |
| `body` | `text('body')` | `NOT NULL` | Message text content |
| `image` | `jsonb('image')` | Nullable | Optional message attachment: `{ url: string; config?: ImageConfig } \| null` |
| `created_at` | `integer('created_at')` | `NOT NULL DEFAULT extract(epoch from now())::int` | Unix epoch timestamp (seconds) |
| `updated_at` | `integer('updated_at')` | `NOT NULL DEFAULT extract(epoch from now())::int` | Unix epoch timestamp (seconds) |

- **Indexes:**
  - `idx_request_messages_thread` on `(thread_id, created_at)`
  - `idx_request_messages_author` on `(author_npm)`

### 2.2 Shared Zod Schemas (`packages/shared/src/index.ts`)

- **`RequestCategorySchema`:** `z.enum(['content', 'feedback', 'help', 'other'])`
  - `'content'` represents the all-in-one **Request for Content** category covering Achievements, Gallery photos, Activities, or other public showcase requests.
- **`RequestContentTypeSchema`:** `z.enum(['achievement', 'gallery', 'activity', 'other'])`
- **`RequestStatusSchema`:** `z.enum(['open', 'in_progress', 'resolved', 'closed'])`
- **`RequestMetadataSchema`:**
  ```ts
  z.object({
    contentType: RequestContentTypeSchema.optional(),
    externalUrl: z.string().url().optional().or(z.literal('')),
    year: z.number().int().min(1990).max(2100).optional(),
    teamName: z.string().optional(),
  })
  ```
- **`RequestThreadCreateSchema`:**
  - Validates `category` (`RequestCategorySchema`), `title` (`z.string().trim().min(1).max(200)`), `description` (`z.string().trim().min(1).max(5000)`), optional `image` (`ImageFieldSchema.optional()`), and optional `metadata` (`RequestMetadataSchema.optional().default({})`).
- **`RequestThreadUpdateSchema`:**
  - Allows partial updates to `category`, `title`, `description`, `image`, `metadata`, and `status` (`RequestStatusSchema`).
  - Role guard in route layer: non-admin authors can update `category`, `title`, `description`, `image`, `metadata`, or set `status` to `'closed'`; admins can transition `status` to any valid state (`'open' | 'in_progress' | 'resolved' | 'closed'`).
- **`RequestMessageCreateSchema` & `RequestMessageUpdateSchema`:**
  - Validates `body` (`z.string().trim().min(1).max(4000)`) and optional `image` (`ImageFieldSchema.optional()`).
- **`RequestThreadSummarySchema` & `RequestThreadDetailSchema`:**
  - Summary includes thread fields, hydrated `author` (`{ npm, name, nama_panggilan, foto }`), and `messageCount`.
  - Detail extends summary with `messages: z.array(RequestMessageSchema)` ordered chronologically (`asc(createdAt), asc(id)`).

---

## 3. REST API, Auth Boundaries & Lifecycle

### 3.1 Endpoints (`apps/backend/src/routes/requests.ts` & `upload.ts`)

All endpoints require `blockUnauthorized()` + `requireWhitelisted()` and respond with `Cache-Control: private, no-store`.

| Method & Path | Access Rule | Query / Body Contract | Response Semantics |
| --- | --- | --- | --- |
| `GET /api/v1/requests` | Creator or Admin | `?category=&status=&search=&scope=mine\|all&page=1&limit=20` | `200 OK` paginated envelope `{ data, total, page, limit, totalPages }`. Non-admins are strictly scoped to `author_npm = req.user.npm` regardless of `scope`. Admins default to `scope=all` (or `scope=mine` on `/requests`). |
| `POST /api/v1/requests` | Any Whitelisted Member | `RequestThreadCreateSchema` | `201 Created` `{ data: RequestThreadDetail }`. Sets `author_npm = req.user.npm` and `status = 'open'`. |
| `GET /api/v1/requests/:id` | Thread Author or Admin | Path param `:id` (integer) | `200 OK` `{ data: RequestThreadDetail }`, `404 Not Found` if missing, or `403 Forbidden` if caller is neither `author_npm` nor `isAdmin`. |
| `PUT /api/v1/requests/:id` | Thread Author or Admin | `RequestThreadUpdateSchema` | `200 OK` `{ data: RequestThreadDetail }`. Author can edit content fields at any time and set `status: 'closed'`; only admin can set `'in_progress'`, `'resolved'`, or reopen to `'open'`. |
| `DELETE /api/v1/requests/:id` | Thread Author or Admin | Path param `:id` | `200 OK` `{ data: { id } }`. Cascade-deletes all child `request_messages`. |
| `POST /api/v1/requests/:id/messages` | Thread Author or Admin | `RequestMessageCreateSchema` | `201 Created` `{ data: RequestMessage }`. Updates parent `request_threads.updated_at`. Non-admin author can reply only when `status` is `'open'` or `'in_progress'` (`400 Bad Request` if `'resolved'` or `'closed'`). Admin can reply at any status. |
| `PUT /api/v1/requests/:id/messages/:messageId` | Message Author or Admin | `RequestMessageUpdateSchema` | `200 OK` `{ data: RequestMessage }`. Members can edit their own messages (`message.authorNpm === req.user.npm`) at any time. |
| `DELETE /api/v1/requests/:id/messages/:messageId` | Message Author or Admin | Path params `:id`, `:messageId` | `200 OK` `{ data: { id: messageId } }`. Members can delete their own messages at any time; admins can delete any message. |
| `POST /api/v1/upload/request` | Any Whitelisted Member | Multipart form-data (`file`, max `2,621,440` bytes) | Uploads image to S3/MinIO under `requests/${callerNpm}-${randomUUID()}.${ext}` and returns `{ data: { url, key, width, height, mime, size } }`. |

### 3.2 Edge Cases & Security Invariants

1. **Strict Private Thread Isolation:** A non-admin member querying, updating, deleting, or posting a message to a thread where `thread.authorNpm !== req.user.npm` receives `403 Forbidden`. No public or unauthenticated read path exists.
2. **Closed/Resolved Reply Guard for Members:** When a thread is `'resolved'` or `'closed'`, non-admin members cannot post new replies (`400 Bad Request: Thread is closed for new replies`), though they retain full permission to edit or delete their existing thread or messages at any time. Admins can reply or reopen the thread at any time.
3. **No N+1 Author Hydration:** `getRequests()` and `getRequestById()` batch-fetch author member profiles (`npm`, `name`, `namaPanggilan`, `foto`) and message counts via `inArray` in a single query pass.
4. **Cross-Thread Message Tampering Prevention:** `PUT` and `DELETE` on `/api/v1/requests/:id/messages/:messageId` verify that `message.threadId === Number(req.params.id)` before mutating, returning `404 Not Found` on mismatch.

---

## 4. Frontend UX (`@zenith/frontend`)

Aligned with `apps/frontend/DESIGN.md`:

### 4.1 Navigation & Routes (`apps/frontend/src/app/router.tsx` & `navigation.ts`)

1. **Member Route (`/requests`):**
   - Wrapped in `<ProtectedRoute>`.
   - `navItems` entry: `label: 'Aspirasi & Request'`, `description: 'Usul konten, feedback & bantuan'`, `icon: MessageSquarePlus`.
2. **Admin Route (`/admin/requests`):**
   - Wrapped in `<AdminRoute>`.
   - `navItems` entry: `label: 'Requests (Admin)'`, `description: 'Triage member requests & threads'`, `icon: Inbox`, `requireAdmin: true`.

### 4.2 Member Showcase View (`/requests`)

- **Tone & Copy:** Friendly, clear Bahasa Indonesia with zero em-dashes or en-dashes (`R-02`), using `.surface-card` glassmorphic containers.
- **Fun 3-Card "Petunjuk" Guide (matching `EditProfilePage.tsx` pattern):**
  1. **1. Pilih Kategori yang Pas:** Mau ajukan Achievement, foto Galeri, atau Kegiatan baru? Pilih kategori **Request Konten**. Punya ide seru atau butuh pertolongan? Pilih **Feedback** atau **Bantuan**.
  2. **2. Lampirkan Foto & Info Pendukung:** Kalau kamu request konten, unggah foto terbaiknya dan isi detail tambahan seperti jenis konten atau link referensi supaya admin cepat memprosesnya.
  3. **3. Diskusi Privat Bareng Admin:** Thread ini cuma bisa dibaca oleh kamu dan admin Zenith. Kamu bisa balas pesan, ubah isi request, atau hapus pesanmu kapan saja.
- **Interactive Thread Experience:**
  - Filter tabs/pills by category (`Semua`, `Request Konten`, `Feedback`, `Bantuan`, `Lainnya`) and status badge (`Terbuka`, `Diproses`, `Selesai`, `Ditutup`).
  - **Buat Request Baru** dialog/form with dynamic helper fields when `category === 'content'` (Content Type selector: `Achievement`, `Galeri`, `Kegiatan`, `Lainnya`, plus optional link/year/team hints and `ImageUploadEditor` targeting `/upload/request`).
  - Thread conversation view showing the opening request card, chronological message bubbles (with `"Admin"` badge on admin replies), inline edit/delete controls on the member's own thread and messages, optional image attachment per reply, and a **Tutup Thread** action when open.

### 4.3 Admin Triage View (`/admin/requests`)

- **Utilitarian Admin View Pattern:**
  - Concise English copy, zero em-dashes/en-dashes, no decorative onboarding banners.
  - Filter bar with `SearchInput` (`/` shortcut to focus), category `Select` (`All Categories`, `Request for Content`, `Feedback`, `Help`, `Other`), and status `Select` (`All Statuses`, `Open`, `In Progress`, `Resolved`, `Closed`).
  - High-density `Table` (`ListState` + `Paginator`) displaying Thread ID (`#id` in `font-mono`), Author (`name` + `npm` in `font-mono`), Category badge (including `contentType` sub-badge when present), Title, Status badge, Reply count (`font-mono tabular-nums`), Updated timestamp, and View/Delete actions.
  - **Thread Detail & Reply Dialog:** Shows full thread metadata, opening image/description, chronological message list, a status selector (`Open`, `In Progress`, `Resolved`, `Closed`), and an admin reply composer supporting text and optional image upload.

---

## 5. In-Scope vs. Out-of-Scope

### In-Scope
- **Shared Contracts (`@zenith/shared`):** `RequestCategorySchema` (`'content' | 'feedback' | 'help' | 'other'`), `RequestContentTypeSchema`, `RequestStatusSchema`, `RequestMetadataSchema`, `RequestThreadSchema`, `RequestThreadCreateSchema`, `RequestThreadUpdateSchema`, `RequestMessageSchema`, `RequestMessageCreateSchema`, `RequestMessageUpdateSchema`, and TypeScript DTO types.
- **Database Schema & Migration (`@zenith/backend`):** `request_threads` and `request_messages` tables + relations in `apps/backend/src/db/schema.ts` and a new Drizzle SQL migration in `apps/backend/drizzle/`.
- **Backend Repository & Routes (`@zenith/backend`):**
  - `apps/backend/src/db/repositories/requests.ts` (re-exported via `repository.ts`) with batch author hydration and transactional cascade operations.
  - `apps/backend/src/routes/requests.ts` registered in `apps/backend/src/app.ts`.
  - `POST /api/v1/upload/request` in `apps/backend/src/routes/upload.ts` (`blockUnauthorized()` + `requireWhitelisted()`).
- **Frontend Member & Admin Features (`@zenith/frontend`):**
  - `apps/frontend/src/features/requests/*` (`MemberRequestsPage.tsx`, `AdminRequestsPage.tsx`, `RequestThreadDialog.tsx`, `RequestFormDialog.tsx`, `api.ts`).
  - Route definitions in `apps/frontend/src/app/router.tsx` (`/requests` and `/admin/requests`) and navigation items in `apps/frontend/src/app/navigation.ts`.
- **Automated Tests (`Vitest`):**
  - Backend integration tests covering private thread visibility (`401`/`403` for non-authors), member vs. admin status transitions, closed-thread reply guards, and full member edit/delete permissions on own threads and messages.
  - Frontend component tests for member request creation, fun "Petunjuk" rendering, thread chat edit/delete, and admin triage filtering.

### Out-of-Scope
- Modifying the read-only `apps/website` (`CSUI-26/website` Astro landing page submodule).
- Automatic one-click insertion into `achievements`, `gallery_items`, or `activities` tables when a `'content'` request is resolved (admins curate and publish public showcase records via their respective admin pages).
- Real-time WebSocket / SSE push notifications or external email/LINE webhook alerts (threads update via REST fetches and manual/focus refresh).
- Access for unauthenticated visitors or non-whitelisted SSO users (all request endpoints strictly require `requireWhitelisted()`).
- Multi-file or non-image binary uploads (e.g., PDF/ZIP attachments); each thread and message supports one optional S3 image attachment (`max 2.5 MB`) plus external links in `metadata.externalUrl` or message text.
