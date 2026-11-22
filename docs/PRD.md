# PRD: Dashboard Navigation Simplification, Split Requests/Feedback, Admin Hub & Member Date of Birth

**Status:** Aligned / Ready for Implementation  
**Scope:** `@zenith/shared`, `@zenith/backend`, `@zenith/frontend`  
**References:** `AGENTS.md`, `apps/frontend/DESIGN.md`

---

## 1. Objective & Summary

Streamline the CSUI Zenith dashboard navigation, eliminate duplicated views, decouple content submissions from feedback/help threads into dedicated domain models, consolidate admin navigation behind a single Admin Hub, and add optional `date_of_birth` support to member records with strict PII isolation.

---

## 2. In-Scope

### 2.1 Member Navigation & Route Cleanup (`@zenith/frontend`)
1. **Remove `Teman Angkatan` from Dashboard:**
   - Remove `/directory` (`Teman Angkatan`) from `apps/frontend/src/app/navigation.ts`.
   - Delete `apps/frontend/src/features/members/CohortDirectoryPage.tsx` and remove its lazy route import.
   - Add a client-side redirect in `apps/frontend/src/app/router.tsx`: `/directory` -> `/my-profile` (`replace`) so stale bookmarks do not 404.
   - Backend `GET /api/v1/members` and `GET /api/v1/members/:npm` remain untouched (used by the public landing page and Admin Members page).
2. **Remove `Edit Profil` from Navigation Bar:**
   - Remove `/my-profile/edit` (`Edit Profil`) from `apps/frontend/src/app/navigation.ts`.
   - Retain the `/my-profile/edit` route in `router.tsx`, reachable via the `"Edit Profilku"` CTA on `MyProfilePage.tsx`.
   - Update `Profilku` (`/my-profile`) in `navigation.ts` to use prefix matching (`end: false`) so `AppHeader` stays highlighted and labeled `Profilku` while editing.
3. **Final Member Navigation Items (`AppHeader` dropdown):**
   - `Profilku` (`/my-profile`)
   - `Permintaan Konten` (`/content-requests`)
   - `Feedback & Bantuan` (`/feedback`)

### 2.2 Split Aspirasi & Request into Two Dedicated Domains (`@zenith/shared`, `@zenith/backend`, `@zenith/frontend`)
1. **Database Schema (`apps/backend/src/db/schema.ts` & SQL Migration):**
   - Replace `request_threads` and `request_messages` with four dedicated tables:
     - `content_requests`: `id` (`serial` PK), `author_npm` (FK -> `members.npm` `ON DELETE CASCADE`), `content_type` (`text` NOT NULL: `'achievement' | 'gallery' | 'activity' | 'other'`), `title`, `description`, `status` (`'open' | 'in_progress' | 'resolved' | 'closed'`), `image` (`jsonb` nullable), `metadata` (`jsonb` NOT NULL default `'{}'`: `{ externalUrl?: string; year?: number; teamName?: string }`), `created_at`, `updated_at`.
     - `content_request_messages`: `id` (`serial` PK), `request_id` (FK -> `content_requests.id` `ON DELETE CASCADE`), `author_npm` (FK -> `members.npm` `ON DELETE CASCADE`), `author_role` (`'user' | 'admin'`), `body`, `image` (`jsonb` nullable), `created_at`, `updated_at`.
     - `feedback_threads`: `id` (`serial` PK), `author_npm` (FK -> `members.npm` `ON DELETE CASCADE`), `category` (`text` NOT NULL: `'feedback' | 'help' | 'other'`), `title`, `description`, `status` (`'open' | 'in_progress' | 'resolved' | 'closed'`), `image` (`jsonb` nullable), `external_url` (`text` nullable), `created_at`, `updated_at`.
     - `feedback_messages`: `id` (`serial` PK), `thread_id` (FK -> `feedback_threads.id` `ON DELETE CASCADE`), `author_npm` (FK -> `members.npm` `ON DELETE CASCADE`), `author_role` (`'user' | 'admin'`), `body`, `image` (`jsonb` nullable), `created_at`, `updated_at`.
   - **Data Migration (`0005_split_requests_and_member_dob.sql`):**
     - Copy existing `request_threads` where `category = 'content'` into `content_requests` (preserving `id`, extracting `metadata->>'contentType'` defaulting to `'other'`), and copy their child `request_messages` into `content_request_messages`.
     - Copy existing `request_threads` where `category IN ('feedback', 'help', 'other')` into `feedback_threads` (preserving `id`, extracting `metadata->>'externalUrl'` into `external_url`), and copy their child `request_messages` into `feedback_messages`.
     - Reset PostgreSQL `serial` sequences (`setval`) for all four tables to `COALESCE(MAX(id), 1)`.
     - Drop legacy `request_messages` and `request_threads` tables.
2. **REST API Endpoints (`apps/backend/src/routes/`):**
   - Remove legacy `/api/v1/requests*` routes and repository.
   - Add `content-requests.ts` and `feedback.ts` routes, both protected by `blockUnauthorized()` + `requireWhitelisted()`, returning `Cache-Control: private, no-store`:
     - `GET/POST /api/v1/content-requests`, `GET/PUT/DELETE /api/v1/content-requests/:id`, `POST /api/v1/content-requests/:id/messages`, `PUT/DELETE /api/v1/content-requests/:id/messages/:messageId`.
     - `GET/POST /api/v1/feedback`, `GET/PUT/DELETE /api/v1/feedback/:id`, `POST /api/v1/feedback/:id/messages`, `PUT/DELETE /api/v1/feedback/:id/messages/:messageId`.
   - Preserve all existing private thread security invariants:
     - Strict thread isolation (`authorNpm === req.user.npm` or `isAdmin`; `403 Forbidden` otherwise).
     - Non-admin list queries always forced to `authorNpm = req.user.npm` regardless of `scope`.
     - Non-admin status updates restricted to `'closed'` only; replies blocked (`400`) when status is `'resolved'` or `'closed'`.
     - Cross-thread message ID validation (`404` on mismatch).
     - Batch author & message-count hydration via `inArray` (no N+1 queries).
   - Keep `POST /api/v1/upload/request` shared for attachments on both content requests and feedback threads.
3. **Link Drive (`externalUrl`) Rule:**
   - **Achievement Content Requests (`contentType === 'achievement'`):** Remove/hide the `Link Drive / Bukti` input in the content request form and omit `metadata.externalUrl` on create/update when `contentType === 'achievement'`.
   - **Gallery / Activity / Other Content Requests & Feedback/Help:** Keep `Link Drive / Link Referensi (Opsional)` available.
   - **Backward Compatibility:** Keep `metadata.externalUrl` optional in `ContentRequestMetadataSchema` and continue rendering any legacy saved `externalUrl` in the thread detail view.
4. **Member & Admin Frontend UX:**
   - **Member Pages (Bahasa Indonesia, `.surface-card` showcase style):**
     - `/content-requests` (`ContentRequestsPage.tsx`): filter by `contentType` (`achievement`, `gallery`, `activity`, `other`) and `status`; private thread dialog & form tailored for content submissions.
     - `/feedback` (`FeedbackPage.tsx`): filter by `category` (`feedback`, `help`, `other`) and `status`; private thread dialog & form tailored for feedback and support.
     - Redirect `/requests` -> `/content-requests` (`replace`) in `router.tsx`.
   - **Admin Inbox (`/admin/requests`, concise English, dense table style):**
     - Single page with two tabs (`Content Requests` and `Feedback & Help`) backed by `/api/v1/content-requests` and `/api/v1/feedback`, preserving search, status/type filters, keyboard shortcuts, and private reply dialogs.

### 2.3 Simplified Admin Navigation & Admin Hub (`@zenith/backend`, `@zenith/frontend`)
1. **Single Admin Navigation Entry:**
   - Replace the 7 individual admin entries in `navigation.ts` / `AppHeader.tsx` dropdown with one entry: `Admin Hub` (`/admin`, `requireAdmin: true`).
   - Update `isNavItemActive` / `findNavItem` so `Admin Hub` resolves as active when visiting `/admin` or any admin sub-route (`/programs`, `/courses`, `/members`, `/achievements`, `/gallery`, `/activities`, `/admin/requests`).
2. **Admin Hub Page (`/admin`, `AdminHubPage.tsx` inside `AdminRoute`):**
   - Utilitarian module launchpad with 7 cards linking to existing sub-pages:
     - Study Programs (`/programs`)
     - Courses (`/courses`)
     - Members (`/members`)
     - Achievements (`/achievements`)
     - Gallery (`/gallery`)
     - Activities (`/activities`)
     - Requests & Feedback Inbox (`/admin/requests`)
   - Displays live summary metrics fetched from a lightweight admin-only endpoint `GET /api/v1/admin/stats` (`blockUnauthorized()`, `adminOnly()`), using SQL `COUNT(*)` queries (total programs, courses, members, achievements, gallery items, activities, open content requests, open feedback threads).
3. **Sub-Page Navigation Aid:**
   - Add a compact `"Back to Admin Hub"` breadcrumb/button on each of the 7 admin sub-pages so admins return to `/admin` in one click.

### 2.4 Optional Member Date of Birth (`@zenith/shared`, `@zenith/backend`, `@zenith/frontend`)
1. **Database & Shared Contract:**
   - Add nullable PostgreSQL column `date_of_birth` (`date('date_of_birth', { mode: 'string' })`) to `members` in `apps/backend/src/db/schema.ts` and migration `0005`.
   - Expose as `dateOfBirth` (`string | null | undefined`) in `MemberSchema`, `MemberCreateSchema`, and `MemberUpdateSchema` in `packages/shared/src/index.ts`.
   - Validate format as strict ISO calendar date `YYYY-MM-DD` (reject invalid dates like `2026-02-31` and future dates beyond today, allow `null` to clear).
2. **Strict PII Auth Boundary (`apps/backend/src/middleware/auth.ts`):**
   - Update `serializeMemberForViewer(member, user)`:
     - **Unauthenticated caller:** strip `email`, `role`, and `dateOfBirth`.
     - **Whitelisted non-admin viewing another member (`user.npm !== member.npm`):** strip `dateOfBirth` (existing `email` and `role` behavior unchanged).
     - **Self (`user.npm === member.npm`) or Admin (`user.isAdmin`):** include `dateOfBirth`.
   - Preserve `Cache-Control: private, no-store` and `Vary: Cookie, Authorization` on `GET /api/v1/members` and `GET /api/v1/members/:npm`.
   - `PUT /api/v1/members/me` accepts optional `dateOfBirth` (and preserves existing DB value when omitted from request body).
3. **Frontend Forms & Safe-Save Edge Case:**
   - **Edit Profile (`EditProfilePage.tsx`):**
     - Wire `dateOfBirth` into state/types, and include the date input block **hidden via JSX comments** with a clear comment explaining how to unhide it later.
     - **Non-destructive save invariant:** While the field is commented out, omit `dateOfBirth` from the `membersApi.updateMe()` payload so saving other profile fields never overwrites or clears an existing `date_of_birth` stored in PostgreSQL.
   - **Admin Member Form (`MemberFormDialog.tsx`):**
     - Add an optional `Date of Birth` (`<input type="date">`) field in the Identity section so admins can view, set, or clear (`null`) a member's date of birth.

---

## 3. Out-of-Scope

- **Public Website (`apps/website`):** Read-only submodule; no modifications to the Astro landing page or public cohort directory.
- **Birthday Features & UI Display:** Rendering `dateOfBirth` on `ProfileShowcaseCard`, birthday calendars, upcoming-birthday widgets, or automated birthday notifications (deferred until `dateOfBirth` is unhidden).
- **Email / Push / Webhook Notifications:** No outbound notifications when content requests or feedback threads are created or replied to.
- **Auto-Publishing Content Requests:** Approved content requests are still published manually by admins via Achievements / Gallery / Activities CRUD pages (no 1-click auto-publish workflow in this release).
- **URL Restructuring of Existing Admin Routes:** Existing admin sub-routes (`/programs`, `/courses`, `/members`, `/achievements`, `/gallery`, `/activities`, `/admin/requests`) keep their current paths rather than migrating to `/admin/*`.
- **Legacy `/api/v1/requests` Compatibility Shim:** Removed cleanly once migrated; no dual-write bridge.
- **Dead Code Cleanup Beyond Scope:** `AppSidebar.tsx` (currently unused by `AppLayout.tsx`) is not refactored unless it imports deleted/renamed navigation symbols that fail lint/build.

---

## 4. Verification & Acceptance Criteria

1. **Database & Migration:**
   - Fresh DB migration and upgrade migration from `0004` cleanly create `content_requests`, `content_request_messages`, `feedback_threads`, `feedback_messages`, and `members.date_of_birth`, preserve existing rows/IDs/sequences, and drop legacy `request_*` tables.
2. **Auth & PII Tests (`@zenith/backend` Vitest):**
   - `GET /api/v1/members` and `GET /api/v1/members/:npm` omit `dateOfBirth` for unauthenticated callers and other non-admin members, and include it for self and admins.
   - `PUT /api/v1/members/me` without `dateOfBirth` leaves an existing DB `date_of_birth` untouched; with valid `YYYY-MM-DD` updates it; with invalid date returns `400`.
   - Full CRUD, thread isolation (`403`), closed-thread reply guard (`400`), and message ownership checks pass for both `/api/v1/content-requests` and `/api/v1/feedback`.
   - `GET /api/v1/admin/stats` returns `401` unauthenticated, `403` for non-admin members, and `200` with accurate counts for admins.
3. **Frontend & Navigation Tests (`@zenith/frontend` Vitest + `oxlint` + `build`):**
   - `navigation.ts` contains only `Profilku`, `Permintaan Konten`, `Feedback & Bantuan`, and (for admins) `Admin Hub`.
   - `/directory` redirects to `/my-profile`; `/requests` redirects to `/content-requests`; `/my-profile/edit` keeps `Profilku` active in header.
   - Content request form hides `Link Drive` when `contentType === 'achievement'` and shows it for `gallery`/`activity`/`other`.
   - `EditProfilePage` renders with the DOB input commented out and omits `dateOfBirth` on submit.
   - `pnpm turbo run build`, `pnpm turbo run lint`, and `pnpm turbo run test` pass cleanly.
