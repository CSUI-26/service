# Dashboard Simplification, Split Content Requests/Feedback, Admin Hub & Member DOB Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in strict sequential order. Every task creates, modifies, or deletes **at most 2 files** and ends with an explicit, deterministic verification command. Track progress with `- [ ]` -> `- [x]` checkboxes.

**Goal:** Deliver every requirement in [`docs/PRD.md`](file:///home/antigravity/VickyIbr/CSUI26/docs/PRD.md) across `@zenith/shared`, `@zenith/backend`, and `@zenith/frontend`:
1. Remove `Teman Angkatan` (`CohortDirectoryPage.tsx`, redirect `/directory` -> `/my-profile`) and remove `Edit Profil` from the top navigation bar while keeping `/my-profile/edit` reachable from `MyProfilePage` with prefix-active `Profilku`.
2. Split `request_threads` / `request_messages` into dedicated threaded tables (`content_requests` + `content_request_messages` and `feedback_threads` + `feedback_messages`) and dedicated REST APIs (`/api/v1/content-requests` and `/api/v1/feedback`), migrating existing rows with preserved IDs/sequences, hiding and omitting `Link Drive` (`metadata.externalUrl`) specifically for `achievement` content requests, splitting member UI into `/content-requests` and `/feedback` (redirect `/requests` -> `/content-requests`), and upgrading `/admin/requests` into a two-tab Admin Inbox.
3. Replace the 7 individual admin dropdown entries with a single `Admin Hub` (`/admin`) navigation item backed by `GET /api/v1/admin/stats` (SQL `COUNT(*)`), linking to all 7 existing admin sub-pages with a `"Back to Admin Hub"` breadcrumb.
4. Add nullable `members.date_of_birth` (`date`, DTO `dateOfBirth: YYYY-MM-DD | null`), enforce strict PII visibility (self + admin only in `serializeMemberForViewer`), expose it in Admin `MemberFormDialog`, and wire it into `EditProfilePage` with the JSX input hidden via comments while omitting `dateOfBirth` on save so stored values are never wiped.

**Tech Stack:** pnpm Workspaces, Turborepo, Fastify v5, Drizzle ORM (`postgres`), PostgreSQL 16, Zod v4, React 19, React Router (`react-router`), Vite, Tailwind CSS v4, `radix-ui`, `shadcn/ui`, `lucide-react`, Vitest, Oxlint.

**References:**
- Product Requirements: [`docs/PRD.md`](file:///home/antigravity/VickyIbr/CSUI26/docs/PRD.md)
- Frontend Visual & Anti-Slop System: [`apps/frontend/DESIGN.md`](file:///home/antigravity/VickyIbr/CSUI26/apps/frontend/DESIGN.md)
- Anti-Slop Ruleset: [`miqdadbadjuber/anti-slop`](https://github.com/miqdadbadjuber/anti-slop)

---

## Global Principles (`writing-plans`, `ponytail`, `ui-ux-pro-max`, `anti-slop`)

1. **Native Capabilities First (`ponytail`):**
   - Install **zero** new third-party dependencies across all workspaces.
   - Use native browser `<input type="date">` for `dateOfBirth` (no datepicker library).
   - Use native PostgreSQL `date` column (`mode: 'string'`), SQL `INSERT ... SELECT` data migration, `setval(...)` sequence sync, and parallel SQL `COUNT(*)` queries for `GET /api/v1/admin/stats`.
   - Use native React Router `<Navigate to="..." replace />` for `/directory` and `/requests` redirects.
   - Reuse existing `shadcn/ui` primitives (`Tabs`, `Table`, `Card`, `Badge`, `Select`, `Dialog`, `Button`, `Input`, `Textarea`, `Field`) and `components/patterns/*` (`PageHeader`, `ListState`, `EmptyState`, `ConfirmDialog`, `FormDialog`, `ImageUploadEditor`, `SearchInput`, `TextField`).

2. **Design Tokens & Typography Scale (`ui-ux-pro-max` & [`apps/frontend/DESIGN.md`](file:///home/antigravity/VickyIbr/CSUI26/apps/frontend/DESIGN.md)):**
   - **Dark Default (`.dark`, Zenith Obsidian):** `--background: #05060d`, `--foreground: #f8fafc`, `--card: #0c101d` (`rgba(12, 16, 29, 0.85)` glass on `.surface-card`), `--muted: #12182b`, `--muted-foreground: #94a3b8`, `--primary: #3b82f6`, `--destructive: #ef4444`, `--border: rgba(255, 255, 255, 0.10)`.
   - **Light Mode (`:root`, Slate High-Contrast):** `--background: #f8fafc`, `--foreground: #0f172a`, `--card: #ffffff` (`rgba(255, 255, 255, 0.92)` glass on `.surface-card`), `--muted: #f1f5f9`, `--muted-foreground: #475569`, `--primary: #2563eb`, `--destructive: #dc2626`, `--border: #e2e8f0`.
   - **Typography Scale:**
     - Page Title (`h1` / `PageHeader`): `text-xl sm:text-2xl font-bold tracking-tight` (`Geist Variable`, `--font-heading`)
     - Section / Card / Dialog Title (`h2` / `h3`): `text-sm sm:text-base font-bold`
     - UI Body & Thread Bubbles: `text-xs sm:text-sm leading-relaxed` (`Inter`, `--font-sans`)
     - Hint / Caption / Timestamp: `text-xs text-muted-foreground`
     - Identifiers, Counts, Dates & NPMs (`#42`, `2026-05-14`, Admin Hub counts): `font-mono tabular-nums text-xs` (`JetBrains Mono`, `--font-mono`)

3. **Anti-Slop Gates ([`miqdadbadjuber/anti-slop`](https://github.com/miqdadbadjuber/anti-slop)):**
   - **R-01 (`antislop-ui` — Purposeful Surfaces):** Member pages (`/content-requests`, `/feedback`) use glassmorphic `.surface-card` containers with concise Bahasa Indonesia onboarding cards; admin views (`/admin`, `/admin/requests`) stay flat, compact, and scannable with zero decorative hero banners, fake KPI sparklines, or ornamental icons.
   - **R-02 (`antislop-copywriting` — Direct, Non-Dev Copywriting):** Zero em-dashes (`—`) or en-dashes (`–`) in UI copy. Zero corporate buzzwords (`seamless`, `elevate`, `empower`, `unlock`, `robust`). Reference controls by visible label, never directional cues (`di kanan`, `di atas`).
   - **R-03 (`antislop-human` & `antislop-layoutmobile` — Accessibility & Reflow):** Every icon-only button requires `aria-label`; Admin Hub breadcrumb uses `<nav aria-label="Admin navigation">`; mobile tap targets meet `44x44px`; grids reflow cleanly from 1 column on mobile to multi-column on `sm:`/`lg:`; functional transitions stay within `150ms-200ms` with `prefers-reduced-motion` safeguards.
   - **R-04 (`antislop-code` — Code Hygiene):** Zero literal hex colors in `.tsx` files, zero empty `catch` blocks, zero `window.confirm`, zero decorative banner comments. The only commented JSX block is the explicitly requested `dateOfBirth` input in `EditProfilePage.tsx`.

4. **Atomic Expand-Migrate-Contract Ordering (Max 2 Files per Task):**
   - Every task modifies, creates, or deletes **at most 2 files** and keeps TypeScript compilation passing at every intermediate step.

---

## File Map

- **Create:**
  - `apps/backend/drizzle/0005_split_requests_and_member_dob.sql`
  - `apps/backend/src/__tests__/split-requests-schema.test.ts`
  - `apps/backend/src/db/repositories/contentRequests.ts`
  - `apps/backend/src/db/repositories/feedback.ts`
  - `apps/backend/src/db/repositories/adminStats.ts`
  - `apps/backend/src/routes/contentRequests.ts`
  - `apps/backend/src/routes/feedback.ts`
  - `apps/backend/src/routes/adminStats.ts`
  - `apps/backend/src/__tests__/split-requests-api.test.ts`
  - `apps/frontend/src/features/admin/api.ts`
  - `apps/frontend/src/features/admin/AdminHubPage.tsx`
  - `apps/frontend/src/features/admin/AdminHubPage.test.tsx`
  - `apps/frontend/src/features/content-requests/api.ts`
  - `apps/frontend/src/features/content-requests/ContentRequestFormDialog.tsx`
  - `apps/frontend/src/features/content-requests/ContentRequestsPage.tsx`
  - `apps/frontend/src/features/feedback/api.ts`
  - `apps/frontend/src/features/feedback/FeedbackFormDialog.tsx`
  - `apps/frontend/src/features/feedback/FeedbackPage.tsx`
  - `apps/frontend/src/features/requests/ThreadConversationDialog.tsx`
- **Modify:**
  - `packages/shared/src/index.ts`
  - `apps/backend/drizzle/meta/_journal.json`
  - `apps/backend/src/db/schema.ts`
  - `apps/backend/src/middleware/auth.ts`
  - `apps/backend/src/db/repositories/members.ts`
  - `apps/backend/src/db/repository.ts`
  - `apps/backend/src/app.ts`
  - `apps/backend/src/__tests__/api.test.ts`
  - `apps/frontend/src/features/members/schema.ts`
  - `apps/frontend/src/features/members/MemberFormDialog.tsx`
  - `apps/frontend/src/features/members/EditProfilePage.tsx`
  - `apps/frontend/src/features/members/MyProfilePage.test.tsx`
  - `apps/frontend/src/app/navigation.ts`
  - `apps/frontend/src/app/navigation.test.ts`
  - `apps/frontend/src/features/auth/AdminRoute.tsx`
  - `apps/frontend/src/features/auth/AdminRoute.test.tsx`
  - `apps/frontend/src/features/requests/AdminRequestsPage.tsx`
  - `apps/frontend/src/app/router.tsx`
  - `apps/frontend/src/features/requests/RequestsPages.test.tsx`
  - `apps/frontend/DESIGN.md`
- **Delete:**
  - `apps/backend/src/routes/requests.ts`
  - `apps/backend/src/db/repositories/requests.ts`
  - `apps/backend/src/__tests__/requests-schema.test.ts`
  - `apps/backend/src/__tests__/requests-api.test.ts`
  - `apps/frontend/src/features/members/CohortDirectoryPage.tsx`
  - `apps/frontend/src/features/requests/MemberRequestsPage.tsx`
  - `apps/frontend/src/features/requests/RequestFormDialog.tsx`
  - `apps/frontend/src/features/requests/RequestThreadDialog.tsx`
  - `apps/frontend/src/features/requests/api.ts`

---

## Phase 1: Shared Contracts (`@zenith/shared`)

### Task 1: Add `dateOfBirth`, Split Content Request / Feedback Schemas, and `AdminStatsSchema`

**Files (1):**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1:** Add an ISO calendar date validator helper (`isValidIsoDate(value: string): boolean`) validating `YYYY-MM-DD`, real calendar day (rejects `2026-02-31`), and not in the future (`<= today` UTC). Add `dateOfBirth: DateOfBirthSchema.nullable().optional()` to `MemberSchema` (which flows into `MemberCreateSchema` and `MemberUpdateSchema`).
- [ ] **Step 2:** Add dedicated schemas & exported types **alongside** legacy `Request*` schemas (legacy schemas are contracted in Task 26 after all consumers migrate):
  - `ContentRequestTypeSchema` (`'achievement' | 'gallery' | 'activity' | 'other'`)
  - `ContentRequestMetadataSchema` (`{ externalUrl?: string; year?: number; teamName?: string }`, keeping `externalUrl` optional for backward compatibility)
  - `ContentRequestMessageSchema`, `ContentRequestMessageCreateSchema`, `ContentRequestMessageUpdateSchema`
  - `ContentRequestSummarySchema`, `ContentRequestDetailSchema`, `ContentRequestCreateSchema`, `ContentRequestUpdateSchema`
  - `FeedbackCategorySchema` (`'feedback' | 'help' | 'other'`)
  - `FeedbackMessageSchema`, `FeedbackMessageCreateSchema`, `FeedbackMessageUpdateSchema`
  - `FeedbackThreadSummarySchema`, `FeedbackThreadDetailSchema`, `FeedbackThreadCreateSchema`, `FeedbackThreadUpdateSchema`
  - `AdminStatsSchema` (`{ programs, courses, members, achievements, galleryItems, activities, openContentRequests, openFeedbackThreads }`)
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/shared run build && pnpm --filter @zenith/shared run lint
  ```

---

## Phase 2: Database, Backend PII Boundaries, Split APIs & Admin Stats (`@zenith/backend`)

### Task 2: Add SQL Migration `0005_split_requests_and_member_dob.sql` and Register Journal Entry

**Files (2):**
- Create: `apps/backend/drizzle/0005_split_requests_and_member_dob.sql`
- Modify: `apps/backend/drizzle/meta/_journal.json`

- [ ] **Step 1:** Write idempotent PostgreSQL DDL + data migration in `0005_split_requests_and_member_dob.sql`:
  - `ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "date_of_birth" date;`
  - Create `content_requests`, `content_request_messages`, `feedback_threads`, `feedback_messages`, foreign keys (`ON DELETE CASCADE`), and btree indexes (`author_npm`, `status`, `content_type` / `category`, `updated_at`, `(request_id, created_at)` / `(thread_id, created_at)`).
  - Guarded `DO $$ ... $$` data migration block: if `request_threads` exists, copy `category = 'content'` rows into `content_requests` (preserving `id`, mapping `metadata->>'contentType'` with fallback `'other'`) and matching `request_messages` into `content_request_messages`; copy `category IN ('feedback', 'help', 'other')` rows into `feedback_threads` (preserving `id`, extracting `NULLIF(metadata->>'externalUrl', '')` into `external_url`) and matching `request_messages` into `feedback_messages`.
  - Sync all four `serial` sequences via `setval(pg_get_serial_sequence(...), COALESCE((SELECT MAX(id) FROM ...), 1), COALESCE((SELECT MAX(id) IS NOT NULL FROM ...), false))`.
  - `DROP TABLE IF EXISTS "request_messages";` and `DROP TABLE IF EXISTS "request_threads";`
- [ ] **Step 2:** Append entry `idx: 5`, `tag: "0005_split_requests_and_member_dob"` to `apps/backend/drizzle/meta/_journal.json`.
- [ ] **Step 3: Verify**
  ```bash
  node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('apps/backend/drizzle/meta/_journal.json','utf8')); if(!j.entries.some(e=>e.idx===5&&e.tag==='0005_split_requests_and_member_dob')) process.exit(1); const sql=fs.readFileSync('apps/backend/drizzle/0005_split_requests_and_member_dob.sql','utf8'); for(const k of ['date_of_birth','content_requests','content_request_messages','feedback_threads','feedback_messages','setval','DROP TABLE IF EXISTS']) if(!sql.includes(k)) process.exit(1); console.log('Migration 0005 verified');"
  ```

### Task 3: Expand Drizzle Schema and Add Schema/Zod Unit Tests

**Files (2):**
- Modify: `apps/backend/src/db/schema.ts`
- Create: `apps/backend/src/__tests__/split-requests-schema.test.ts`

- [ ] **Step 1:** In `apps/backend/src/db/schema.ts`, import `date` from `drizzle-orm/pg-core`, add `dateOfBirth: date('date_of_birth', { mode: 'string' })` to `members`, and add `contentRequests`, `contentRequestMessages`, `feedbackThreads`, `feedbackMessages` tables plus relations (temporarily keep `requestThreads`/`requestMessages` until Task 10 removes them cleanly).
- [ ] **Step 2:** Create `apps/backend/src/__tests__/split-requests-schema.test.ts` testing:
  - `MemberSchema` `dateOfBirth` validation (valid `YYYY-MM-DD`, `null`, omitted, rejects `2026-02-31`, rejects future date, rejects malformed strings).
  - `ContentRequestCreateSchema`, `FeedbackThreadCreateSchema`, and `AdminStatsSchema` validation.
  - Drizzle `getTableColumns()` assertions for `members.dateOfBirth`, `contentRequests`, `contentRequestMessages`, `feedbackThreads`, and `feedbackMessages`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/backend run build && pnpm --filter @zenith/backend exec vitest run src/__tests__/split-requests-schema.test.ts
  ```

### Task 4: Wire Member `dateOfBirth` Persistence & Strict PII Auth Boundary

**Files (2):**
- Modify: `apps/backend/src/db/repositories/members.ts`
- Modify: `apps/backend/src/middleware/auth.ts`

- [ ] **Step 1:** In `apps/backend/src/db/repositories/members.ts`:
  - Map `dateOfBirth: row.dateOfBirth ?? null` in `mapMemberRow()`.
  - Persist `dateOfBirth: member.dateOfBirth ?? null` in `createMember()`.
  - In `updateMember()`, only set `set.dateOfBirth = updates.dateOfBirth` when `updates.dateOfBirth !== undefined` (so omitted `dateOfBirth` never overwrites an existing DB value).
- [ ] **Step 2:** In `apps/backend/src/middleware/auth.ts`, update `serializeMemberForViewer(member, user)`:
  - Unauthenticated (`!user?.isWhitelisted`): strip `email`, `role`, and `dateOfBirth`.
  - Whitelisted non-admin viewing another member (`!user.isAdmin && user.npm !== member.npm`): strip `dateOfBirth` while keeping existing `email` and `role` behavior unchanged.
  - Self (`user.npm === member.npm`) or Admin (`user.isAdmin`): return full `Member` including `dateOfBirth`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

### Task 5: Create `contentRequests` and `feedback` Repositories

**Files (2):**
- Create: `apps/backend/src/db/repositories/contentRequests.ts`
- Create: `apps/backend/src/db/repositories/feedback.ts`

- [ ] **Step 1:** Implement `apps/backend/src/db/repositories/contentRequests.ts`:
  - `getContentRequests({ authorNpm, contentType, status, search, page, limit })` with batch `inArray` author & message-count hydration (no N+1).
  - `getContentRequestById(id)`, `createContentRequest(authorNpm, input)`, `updateContentRequest(id, updates)`, `deleteContentRequest(id)`.
  - `getContentRequestMessageById(messageId)`, `createContentRequestMessage(...)`, `updateContentRequestMessage(...)`, `deleteContentRequestMessage(...)` inside `db.transaction()` updating parent `updatedAt`.
  - When `contentType === 'achievement'`, strip `externalUrl` from `metadata` on create/update (while preserving legacy `metadata.externalUrl` on reads).
- [ ] **Step 2:** Implement `apps/backend/src/db/repositories/feedback.ts`:
  - `getFeedbackThreads({ authorNpm, category, status, search, page, limit })` with batch `inArray` author & message-count hydration.
  - `getFeedbackThreadById(id)`, `createFeedbackThread(authorNpm, input)`, `updateFeedbackThread(id, updates)`, `deleteFeedbackThread(id)`.
  - `getFeedbackMessageById(messageId)`, `createFeedbackMessage(...)`, `updateFeedbackMessage(...)`, `deleteFeedbackMessage(...)` inside `db.transaction()` updating parent `updatedAt`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

### Task 6: Create `adminStats` Repository and Export New Repositories

**Files (2):**
- Create: `apps/backend/src/db/repositories/adminStats.ts`
- Modify: `apps/backend/src/db/repository.ts`

- [ ] **Step 1:** Create `apps/backend/src/db/repositories/adminStats.ts` exporting `getAdminStats(): Promise<AdminStats>` using parallel SQL `COUNT(*)::int` queries across `programs`, `courses`, `members`, `achievements`, `galleryItems`, `activities`, `contentRequests` (`status IN ('open', 'in_progress')`), and `feedbackThreads` (`status IN ('open', 'in_progress')`).
- [ ] **Step 2:** Re-export `./repositories/contentRequests.js`, `./repositories/feedback.js`, and `./repositories/adminStats.js` from `apps/backend/src/db/repository.ts`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

### Task 7: Create `/api/v1/content-requests` and `/api/v1/feedback` Fastify Routes

**Files (2):**
- Create: `apps/backend/src/routes/contentRequests.ts`
- Create: `apps/backend/src/routes/feedback.ts`

- [ ] **Step 1:** Implement `contentRequestRoutes` (`/api/v1/content-requests`, `/:id`, `/:id/messages`, `/:id/messages/:messageId`) with `[blockUnauthorized(), requireWhitelisted()]`, `Cache-Control: private, no-store`, strict `authorNpm` / `isAdmin` isolation (`403`), non-admin `scope: 'mine'` enforcement, non-admin status update guard (`closed` only), closed/resolved reply guard (`400`), cross-thread message verification (`404`), and `externalUrl` omission when `contentType === 'achievement'`.
- [ ] **Step 2:** Implement `feedbackRoutes` (`/api/v1/feedback`, `/:id`, `/:id/messages`, `/:id/messages/:messageId`) with the identical security invariants and `FeedbackThread*Schema` / `FeedbackMessage*Schema` validation.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

### Task 8: Create `/api/v1/admin/stats` Route and Wire `app.ts`

**Files (2):**
- Create: `apps/backend/src/routes/adminStats.ts`
- Modify: `apps/backend/src/app.ts`

- [ ] **Step 1:** Create `adminStatsRoutes` serving `GET /api/v1/admin/stats` protected by `[blockUnauthorized(), adminOnly()]` with `Cache-Control: private, no-store` returning `{ data: await repo.getAdminStats() }`.
- [ ] **Step 2:** Update `apps/backend/src/app.ts` to register `contentRequestRoutes`, `feedbackRoutes`, and `adminStatsRoutes`, and remove `requestRoutes`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

### Task 9: Unexport Legacy Requests Repository & Delete Legacy Route File

**Files (2):**
- Modify: `apps/backend/src/db/repository.ts`
- Delete: `apps/backend/src/routes/requests.ts`

- [ ] **Step 1:** Remove `export * from './repositories/requests.js';` from `apps/backend/src/db/repository.ts`.
- [ ] **Step 2:** Delete `apps/backend/src/routes/requests.ts`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

### Task 10: Delete Legacy Requests Repository & Contract Drizzle Schema

**Files (2):**
- Delete: `apps/backend/src/db/repositories/requests.ts`
- Modify: `apps/backend/src/db/schema.ts`

- [ ] **Step 1:** Delete `apps/backend/src/db/repositories/requests.ts`.
- [ ] **Step 2:** Remove `requestThreads`, `requestMessages`, `requestThreadsRelations`, `requestMessagesRelations`, and the unused `RequestMetadata` import from `apps/backend/src/db/schema.ts`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

### Task 11: Delete Legacy Backend Request Test Files

**Files (2):**
- Delete: `apps/backend/src/__tests__/requests-schema.test.ts`
- Delete: `apps/backend/src/__tests__/requests-api.test.ts`

- [ ] **Step 1:** Delete both legacy test files replaced by `split-requests-schema.test.ts` and Task 12's `split-requests-api.test.ts`.
- [ ] **Step 2: Verify**
  ```bash
  pnpm --filter @zenith/backend run build
  ```

### Task 12: Add Backend Integration Tests for Split Requests, Admin Stats & Member DOB PII

**Files (2):**
- Create: `apps/backend/src/__tests__/split-requests-api.test.ts`
- Modify: `apps/backend/src/__tests__/api.test.ts`

- [ ] **Step 1:** Create `apps/backend/src/__tests__/split-requests-api.test.ts` verifying:
  - `/api/v1/content-requests` CRUD, `achievement` strips `metadata.externalUrl` while `gallery` keeps it, strict thread isolation (`401`/`403`), closed-thread reply guard (`400`), message edit/delete ownership, and `/api/v1/upload/request`.
  - `/api/v1/feedback` CRUD, `externalUrl` support, strict thread isolation (`401`/`403`), status transitions, and message CRUD.
  - `GET /api/v1/admin/stats` returns `401` unauthenticated, `403` for regular member, and `200` with exact SQL counts for admin.
- [ ] **Step 2:** Extend `apps/backend/src/__tests__/api.test.ts` to test `dateOfBirth`:
  - `GET /api/v1/members` and `GET /api/v1/members/:npm` strip `dateOfBirth` for unauthenticated callers and other non-admin members, and include it for self and admins.
  - `PUT /api/v1/members/me` omits `dateOfBirth` -> preserves existing DB value; passes valid `YYYY-MM-DD` -> updates; passes invalid date -> `400`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/backend run build && pnpm --filter @zenith/backend test
  ```

---

## Phase 3: Frontend Member DOB, Navigation Cleanup, Admin Hub & Split UI (`@zenith/frontend`)

### Task 13: Add Optional `dateOfBirth` to Admin Member Form Schema & Dialog

**Files (2):**
- Modify: `apps/frontend/src/features/members/schema.ts`
- Modify: `apps/frontend/src/features/members/MemberFormDialog.tsx`

- [ ] **Step 1:** In `apps/frontend/src/features/members/schema.ts`, add `dateOfBirth` (`string` empty or valid ISO `YYYY-MM-DD`, mapped to `null` when empty in `toMemberPayload`).
- [ ] **Step 2:** In `apps/frontend/src/features/members/MemberFormDialog.tsx`, add `<TextField id="member-dob" label="Date of birth" type="date" hint="Optional." error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />` inside the `Identity` section and map `member.dateOfBirth ?? ''` in `toFormValues`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/frontend exec vitest run src/features/members/schema.test.ts src/features/members/MembersPage.test.tsx && pnpm --filter @zenith/frontend run lint
  ```

### Task 14: Wire Commented-Out `dateOfBirth` in `EditProfilePage` with Non-Destructive Save

**Files (2):**
- Modify: `apps/frontend/src/features/members/EditProfilePage.tsx`
- Modify: `apps/frontend/src/features/members/MyProfilePage.test.tsx`

- [ ] **Step 1:** In `apps/frontend/src/features/members/EditProfilePage.tsx`:
  - Add `dateOfBirth: ''` to form state and populate it from `res.data.dateOfBirth ?? ''`.
  - Add the native `<Input id="dateOfBirth" type="date" ... />` block **hidden inside JSX comments** with a concise note explaining how to unhide it later and include `dateOfBirth` in the submit payload.
  - In `handleSubmit`, destructure and **omit** `dateOfBirth` from the payload passed to `membersApi.updateMe(...)` while the field remains commented out so existing DB values are never cleared.
- [ ] **Step 2:** In `apps/frontend/src/features/members/MyProfilePage.test.tsx`, add a test confirming `EditProfilePage` does not render a visible `dateOfBirth` input and omits `dateOfBirth` from `PUT /api/v1/members/me` on save.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/frontend exec vitest run src/features/members/MyProfilePage.test.tsx && pnpm --filter @zenith/frontend run lint
  ```

### Task 15: Simplify Navigation Config to 3 Member Items + 1 Admin Hub Item

**Files (2):**
- Modify: `apps/frontend/src/app/navigation.ts`
- Modify: `apps/frontend/src/app/navigation.test.ts`

- [ ] **Step 1:** Update `apps/frontend/src/app/navigation.ts`:
  - Extend `NavItem` with optional `matchPaths?: string[]`.
  - Export `ADMIN_SUB_ROUTES = ['/programs', '/courses', '/members', '/achievements', '/gallery', '/activities', '/admin/requests'] as const` and `isAdminSubRoute(pathname: string): boolean`.
  - Set `navItems` to exactly 4 entries:
    1. `Profilku` (`/my-profile`, `end: false` so `/my-profile/edit` keeps `Profilku` active)
    2. `Permintaan Konten` (`/content-requests`, `end: true`, Bahasa Indonesia description)
    3. `Feedback & Bantuan` (`/feedback`, `end: true`, Bahasa Indonesia description)
    4. `Admin Hub` (`/admin`, `requireAdmin: true`, `matchPaths: [...ADMIN_SUB_ROUTES]`, concise English description)
  - Update `isNavItemActive` to also check `item.matchPaths`.
- [ ] **Step 2:** Update `apps/frontend/src/app/navigation.test.ts` to assert `/my-profile/edit` resolves to `Profilku`, `/directory` is no longer in `navItems`, `/content-requests` and `/feedback` resolve as member items, and `/admin` plus all 7 admin sub-routes resolve to `Admin Hub` (`requireAdmin: true`).
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/frontend exec vitest run src/app/navigation.test.ts && pnpm --filter @zenith/frontend run lint
  ```

### Task 16: Add Automatic `"Back to Admin Hub"` Breadcrumb in `AdminRoute`

**Files (2):**
- Modify: `apps/frontend/src/features/auth/AdminRoute.tsx`
- Modify: `apps/frontend/src/features/auth/AdminRoute.test.tsx`

- [ ] **Step 1:** In `apps/frontend/src/features/auth/AdminRoute.tsx`, when `isAdminSubRoute(location.pathname)` is true, render a compact accessible breadcrumb `<nav aria-label="Admin navigation" className="mb-4">` with a `<Link to="/admin">` (`ArrowLeft` icon + `"Back to Admin Hub"` text, `min-h-9` / touch-friendly padding, semantic tokens only) above `{children}`. On `/admin` itself, render `{children}` directly.
- [ ] **Step 2:** Add unit tests in `apps/frontend/src/features/auth/AdminRoute.test.tsx` verifying the `"Back to Admin Hub"` link appears on `/programs` and `/admin/requests`, and does not appear on `/admin`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/frontend exec vitest run src/features/auth/AdminRoute.test.tsx && pnpm --filter @zenith/frontend run lint
  ```

### Task 17: Build Admin Stats API Client and `AdminHubPage` (`/admin`)

**Files (2):**
- Create: `apps/frontend/src/features/admin/api.ts`
- Create: `apps/frontend/src/features/admin/AdminHubPage.tsx`

- [ ] **Step 1:** Create `apps/frontend/src/features/admin/api.ts` exporting `adminStatsApi.get()` (`api<{ data: AdminStats }>('/admin/stats')`).
- [ ] **Step 2:** Create `apps/frontend/src/features/admin/AdminHubPage.tsx`:
  - Uses `useDocumentTitle('Admin Hub')`, `PageHeader` (concise English, zero em-dashes, zero buzzwords), and `ListState` for loading/error/retry.
  - Renders a flat, compact responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`) of 7 clickable `Link` module cards (`Study Programs`, `Courses`, `Members`, `Achievements`, `Gallery`, `Activities`, `Requests & Feedback`) showing each module's live count in `font-mono tabular-nums` (plus open content requests & open feedback counts on the Inbox card).
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/frontend run build && pnpm --filter @zenith/frontend run lint
  ```

### Task 18: Create Split Frontend API Clients (`content-requests` & `feedback`)

**Files (2):**
- Create: `apps/frontend/src/features/content-requests/api.ts`
- Create: `apps/frontend/src/features/feedback/api.ts`

- [ ] **Step 1:** Create `apps/frontend/src/features/content-requests/api.ts` with `contentRequestsApi` (`list`, `get`, `create`, `update`, `remove`, `createMessage`, `updateMessage`, `removeMessage` targeting `/content-requests`), Bahasa Indonesia member labels (`MEMBER_CONTENT_TYPE_LABELS`, `MEMBER_STATUS_LABELS`), English admin labels (`ADMIN_CONTENT_TYPE_LABELS`, `ADMIN_STATUS_LABELS`), `statusBadgeVariant`, and `formatEpochTimestamp`.
- [ ] **Step 2:** Create `apps/frontend/src/features/feedback/api.ts` with `feedbackApi` (`list`, `get`, `create`, `update`, `remove`, `createMessage`, `updateMessage`, `removeMessage` targeting `/feedback`), Bahasa Indonesia member labels (`MEMBER_FEEDBACK_CATEGORY_LABELS`), and English admin labels (`ADMIN_FEEDBACK_CATEGORY_LABELS`).
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/frontend run build && pnpm --filter @zenith/frontend run lint
  ```

### Task 19: Create `ContentRequestFormDialog` (No Link Drive on Achievement) & `FeedbackFormDialog`

**Files (2):**
- Create: `apps/frontend/src/features/content-requests/ContentRequestFormDialog.tsx`
- Create: `apps/frontend/src/features/feedback/FeedbackFormDialog.tsx`

- [ ] **Step 1:** Create `ContentRequestFormDialog.tsx` (`mode: 'member' | 'admin'`):
  - `contentType` `Select` (`achievement`, `gallery`, `activity`, `other`), `title`, `teamName`, `year`, `description`, and `ImageUploadEditor` (`/upload/request`, `defaultAspect="16:9"`).
  - **Achievement Link Drive rule:** Render the `Link Drive / Bukti (Opsional)` (`externalUrl`) field ONLY when `contentType !== 'achievement'`, and omit `metadata.externalUrl` from the submitted payload whenever `contentType === 'achievement'`.
  - Validates with `ContentRequestCreateSchema` before invoking `onSubmit`.
- [ ] **Step 2:** Create `FeedbackFormDialog.tsx` (`mode: 'member' | 'admin'`):
  - `category` `Select` (`feedback`, `help`, `other`), optional `externalUrl` (`Link Referensi (Opsional)`), `title`, `description`, and `ImageUploadEditor` (`/upload/request`).
  - Validates with `FeedbackThreadCreateSchema` before invoking `onSubmit`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/frontend run build && pnpm --filter @zenith/frontend run lint
  ```

### Task 20: Create Domain-Aware `ThreadConversationDialog` and Member `ContentRequestsPage`

**Files (2):**
- Create: `apps/frontend/src/features/requests/ThreadConversationDialog.tsx`
- Create: `apps/frontend/src/features/content-requests/ContentRequestsPage.tsx`

- [ ] **Step 1:** Create `apps/frontend/src/features/requests/ThreadConversationDialog.tsx` accepting `domain: 'content-request' | 'feedback'` and dispatching `get`, `update`, `remove`, `createMessage`, `updateMessage`, `removeMessage` to `contentRequestsApi` or `feedbackApi`. Renders legacy `externalUrl` link if already saved on older records, preserves private thread status controls, inline message edit/delete, and `ConfirmDialog` (zero `window.confirm`).
- [ ] **Step 2:** Create `apps/frontend/src/features/content-requests/ContentRequestsPage.tsx` (`/content-requests`):
  - Bahasa Indonesia member showcase layout (`.surface-card`, 3-card **Petunjuk** guide without directional cues or em-dashes), filter pills for `contentType` (`Semua`, `Achievement`, `Galeri`, `Kegiatan`, `Konten Lainnya`), status `Select`, `ListState`, `Paginator`, `ContentRequestFormDialog`, and `ThreadConversationDialog` (`domain="content-request"`).
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/frontend run build && pnpm --filter @zenith/frontend run lint
  ```

### Task 21: Create Member `FeedbackPage` and Upgrade Two-Tab `AdminRequestsPage`

**Files (2):**
- Create: `apps/frontend/src/features/feedback/FeedbackPage.tsx`
- Modify: `apps/frontend/src/features/requests/AdminRequestsPage.tsx`

- [ ] **Step 1:** Create `apps/frontend/src/features/feedback/FeedbackPage.tsx` (`/feedback`):
  - Bahasa Indonesia member showcase layout (`.surface-card`, 3-card **Petunjuk** guide), filter pills for `category` (`Semua`, `Feedback`, `Bantuan`, `Lainnya`), status `Select`, `ListState`, `Paginator`, `FeedbackFormDialog`, and `ThreadConversationDialog` (`domain="feedback"`).
- [ ] **Step 2:** Update `apps/frontend/src/features/requests/AdminRequestsPage.tsx` (`/admin/requests`) to use `shadcn/ui` `Tabs` (`Content Requests` tab backed by `/content-requests` with `contentType` + `status` + `search` filters; `Feedback & Help` tab backed by `/feedback` with `category` + `status` + `search` filters), reusing `ContentRequestFormDialog`, `FeedbackFormDialog`, and `ThreadConversationDialog`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/frontend run build && pnpm --filter @zenith/frontend run lint
  ```

### Task 22: Update `router.tsx` Routes/Redirects and Delete `CohortDirectoryPage.tsx`

**Files (2):**
- Modify: `apps/frontend/src/app/router.tsx`
- Delete: `apps/frontend/src/features/members/CohortDirectoryPage.tsx`

- [ ] **Step 1:** Update `apps/frontend/src/app/router.tsx`:
  - Add lazy routes: `/admin` (`AdminRoute` -> `AdminHubPage`), `/content-requests` (`ContentRequestsPage`), `/feedback` (`FeedbackPage`).
  - Replace `/directory` with `<Navigate to="/my-profile" replace />` and `/requests` with `<Navigate to="/content-requests" replace />`.
  - Remove lazy import of `CohortDirectoryPage` and `MemberRequestsPage`.
- [ ] **Step 2:** Delete `apps/frontend/src/features/members/CohortDirectoryPage.tsx`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/frontend run build && pnpm --filter @zenith/frontend run lint
  ```

### Task 23: Update Request Page Tests & Add `AdminHubPage` Tests

**Files (2):**
- Modify: `apps/frontend/src/features/requests/RequestsPages.test.tsx`
- Create: `apps/frontend/src/features/admin/AdminHubPage.test.tsx`

- [ ] **Step 1:** Rewrite `apps/frontend/src/features/requests/RequestsPages.test.tsx` to cover:
  - `ContentRequestsPage` rendering, creating an `achievement` request (asserting `Link Drive` input is NOT rendered and `metadata.externalUrl` is omitted), and switching to `gallery` (asserting `Link Drive` input IS rendered).
  - `FeedbackPage` rendering, category filtering, and thread creation via `/feedback`.
  - Two-tab `AdminRequestsPage` switching between `Content Requests` and `Feedback & Help` tabs and calling `/content-requests` and `/feedback`.
  - Anti-slop assertion: zero em-dashes (`—`) or en-dashes (`–`) in rendered UI text.
- [ ] **Step 2:** Create `apps/frontend/src/features/admin/AdminHubPage.test.tsx` verifying all 7 module links, live stat counts from `/admin/stats`, and error/retry via `ListState`.
- [ ] **Step 3: Verify**
  ```bash
  pnpm --filter @zenith/frontend exec vitest run src/features/requests/RequestsPages.test.tsx src/features/admin/AdminHubPage.test.tsx && pnpm --filter @zenith/frontend run lint
  ```

### Task 24: Delete Legacy `MemberRequestsPage.tsx` and `RequestFormDialog.tsx`

**Files (2):**
- Delete: `apps/frontend/src/features/requests/MemberRequestsPage.tsx`
- Delete: `apps/frontend/src/features/requests/RequestFormDialog.tsx`

- [ ] **Step 1:** Delete both superseded frontend files.
- [ ] **Step 2: Verify**
  ```bash
  pnpm --filter @zenith/frontend run build && pnpm --filter @zenith/frontend run lint
  ```

### Task 25: Delete Legacy `RequestThreadDialog.tsx` and `requests/api.ts`

**Files (2):**
- Delete: `apps/frontend/src/features/requests/RequestThreadDialog.tsx`
- Delete: `apps/frontend/src/features/requests/api.ts`

- [ ] **Step 1:** Delete both superseded frontend files.
- [ ] **Step 2: Verify**
  ```bash
  pnpm --filter @zenith/frontend run build && pnpm --filter @zenith/frontend run lint && pnpm --filter @zenith/frontend test
  ```

### Task 26: Contract Legacy Schemas in `@zenith/shared` & Sync `DESIGN.md`

**Files (2):**
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/frontend/DESIGN.md`

- [ ] **Step 1:** Remove the now-unused legacy `RequestCategorySchema`, `RequestContentTypeSchema`, `RequestMetadataSchema`, `RequestMessage*Schema`, `RequestThread*Schema` and their types from `packages/shared/src/index.ts` (keep shared `RequestStatusSchema` / `RequestAuthorSchema` or alias cleanly if used by both new domains).
- [ ] **Step 2:** Update the `Layout & Navigation` section of `apps/frontend/DESIGN.md` to reflect the 3 member items (`Profilku`, `Permintaan Konten`, `Feedback & Bantuan`) and single `Admin Hub` (`/admin`) dropdown entry.
- [ ] **Step 3: Final Full-Monorepo Verification**
  ```bash
  pnpm turbo run build && pnpm turbo run lint && pnpm turbo run test
  ```

---

## Final Anti-Slop & Hygiene Gate

Run after Task 26 to confirm zero regressions across UI copy, tokens, and code hygiene:
```bash
# Confirm zero literal hex colors or window.confirm in new/modified frontend TSX files
rg -n "#[0-9a-fA-F]{3,6}|window\.confirm" apps/frontend/src/features/admin/ apps/frontend/src/features/content-requests/ apps/frontend/src/features/feedback/ apps/frontend/src/features/requests/
# Confirm zero em-dashes or en-dashes in UI copy
rg -n "—|–" apps/frontend/src/features/admin/ apps/frontend/src/features/content-requests/ apps/frontend/src/features/feedback/ apps/frontend/src/features/requests/ apps/frontend/src/app/navigation.ts
```
