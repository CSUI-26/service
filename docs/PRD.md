# PRD: CSUI Zenith Frontend UI/UX Rebuild (`@zenith/frontend`)

## 1. Objective & Product Vision

Rebuild `@zenith/frontend` (`apps/frontend`) in `CSUI26` to elevate UX for all SSO-UI whitelisted Zenith 2026 members while simplifying admin-only backoffice maintenance:

1. **Authentic `zenith.csui.dev` Visual Identity:** Align colors, typography, glassmorphic surfaces, and radii with [`https://zenith.csui.dev`](https://zenith.csui.dev) (`#030007` deep obsidian canvas, `#0b0f19` frame, `#0011ff` / `#4888ff` electric cobalt accents, `#ff0000` ambient crimson radial glow, heavy italic display typography, and high-contrast light mode toggle).
2. **Separate Preview & Edit Profile Pages for Whitelisted Members:** Split the member experience into two dedicated views:
   - **Preview Page (`/my-profile` — "Profilku"):** Dedicated social/e-commerce creator showcase card with a locked 1:1 photo stage, glassmorphic details box, quote callout, interest pills, and friendly Bahasa Indonesia onboarding banner.
   - **Edit Page (`/my-profile/edit` — "Edit Profil"):** Dedicated profile editor studio with fun Bahasa Indonesia instructions and tips (Lock Photo guide, comma-separated Niche tags tip, and Quotes/Socials tip) + interactive 1:1 photo crop studio (`PUT /api/v1/members/me`).
   - **Cohort Directory (`/directory` — "Teman Angkatan"):** Social discovery feed (`GET /api/v1/members`) with fun Bahasa Indonesia guidance to find study/hackathon/gaming partners by niche or major.
3. **Lock Photo Gesture Protection:** Prevent accidental photo panning, crop shifts, or swipe gestures while scrolling or viewing by defaulting the photo frame/editor to **Locked** (`touch-action: pan-y`) with an explicit **Buka Kunci Foto / Kunci Foto** toggle overlay.
4. **Simplified Utilitarian Admin Routes:** Strip unnecessary visual decoration and fun onboarding banners from admin-only routes (`/programs`, `/courses`, `/members`, `/achievements` inside `AdminRoute`) by consolidating them onto a dense, scannable primitive table pattern (`AdminDataTable` + `FormDialog`).
5. **Scalable Radix UI + `shadcn/ui` Primitive Architecture & Dropdown Header Shell:** Standardize interactive controls on composable `radix-ui` + `shadcn/ui` primitives, set **Dark theme (`.dark`) as the default**, and use a single overflow-free sticky top header with the italic **`ZENITH`** wordmark on the left and the **icon-only Theme Toggle** + **Dropdown Navigation Menu** on the right.

---

## 2. Visual Taste & Semantic Tokens (`apps/frontend/DESIGN.md` & `src/index.css`)

| Token / Dimension | Dark Default (`.dark` — Zenith Obsidian) | Light Toggle (`:root` — Slate High-Contrast) | Reference (`zenith.csui.dev` & `docs/index.html`) |
| --- | --- | --- | --- |
| `--background` | `#05060d` | `#f8fafc` | `--bg-canvas: #05060d` |
| `--card` / `--popover` | `#0c101d` (`rgba(12,16,29,0.85)` glass on showcase) | `#ffffff` | `--bg-surface: #0c101d` |
| `--muted` / `--secondary` | `#12182b` | `#f1f5f9` | `--bg-elevated: #12182b` |
| `--primary` | `#3b82f6` (hover `#2563eb`) | `#2563eb` | `--accent-cobalt: #3b82f6` |
| `--accent-crimson` | `#ef4444` (ambient radial backdrop only) | `rgba(220,38,38,0.05)` | `--accent-red: red` |
| `--border` | `rgba(255, 255, 255, 0.10)` (`#1e293b` on flat admin tables) | `#e2e8f0` | `border: 1px solid rgba(255,255,255,0.1)` |
| **Brand Wordmark** | `ZENITH` (`font-weight: 850`, `italic`, gradient text, **no left logo icon**) | Same | `.zenith-wordmark` in `docs/index.html` |
| **Header Navigation** | Left: `ZENITH` wordmark. Right: Icon-only `ThemeToggle` (left) + `DropdownMenu` navigation (right). | Same | `docs/index.html` header |
| **Body & Monospace** | `Inter` (`--font-sans`), `JetBrains Mono` (`--font-mono`, `tabular-nums`) | Same | NPM, SKS, year, crop zoom/rotation |

---

## 3. Auth Boundaries, Copy Tone & Route Architecture

- **Copy Rules (`anti-slop` + User Guidelines):**
  - Never expose developer-only text (e.g. `"NPM & Role locked by Auth"`, `"PUT /api/v1/members/me"`, `"AdminRoute"`, `"touch-action: pan-y"`, `"1:1 WebP"`).
  - Never use directional/position-dependent instructions (e.g. `"Klik tombol di kanan!"` or `"di atas"`) because responsive layouts reflow buttons across screen sizes; always refer to controls by their label (e.g. **Edit Profilku**, **Buka Kunci Foto**).
  - Zero em-dashes (`—`) or en-dashes (`–`) in UI copy (`R-02`).

| Route | Guard | Audience | Copy Tone & UX Specification |
| --- | --- | --- | --- |
| `/login`, `/auth/callback`, `/access-denied` | Public | All visitors / SSO-UI login flow | Zenith obsidian + cobalt/crimson ambient card (`LoginPage.tsx`, wordmark-only header without logo); non-whitelisted SSO users receive `403` and redirect to `/access-denied`. |
| `/` -> `/my-profile` | `ProtectedRoute` (`isWhitelisted === true`) | All whitelisted CSUI '26 SSO-UI members | **Dedicated Preview Page ("Profilku"):**<br>- **Fun Bahasa Indonesia Banner:** Position-agnostic welcome banner with **Edit Profilku** action button.<br>- **Hero Showcase Card (`ProfileShowcaseCard`):** 1:1 locked photo stage (`Foto Terkunci`) + details card (nickname, full name, study program pill, bio, favorite quote callout, interest pills, and social link buttons with platform icons). |
| `/my-profile/edit` | `ProtectedRoute` (`isWhitelisted === true`) | All whitelisted CSUI '26 SSO-UI members | **Dedicated Edit Profile Page ("Edit Profil"):**<br>- **Fun Bahasa Indonesia Tips Cards:** (1) *1. Fitur Kunci Foto*, (2) *2. Tips Niche & Minat* (comma-separated tags), (3) *3. Quotes & Sosial Media* (username-only input).<br>- **Photo Studio & Form:** 1:1 `ImageUploadEditor` with **Buka Kunci Foto / Kunci Foto** toggle + form fields saving via `PUT /api/v1/members/me` and navigating back to `/my-profile`. |
| `/directory` | `ProtectedRoute` (`isWhitelisted === true`) | All whitelisted CSUI '26 SSO-UI members | **Cohort Discovery Page ("Teman Angkatan"):**<br>- **Fun Bahasa Indonesia Guide:** Encourages searching by interest (`Game Dev`, `Cyber Security`) or filtering by study program (`CS`, `SI`, `AI`) via `GET /api/v1/members`, opening a peer preview dialog when a classmate card is clicked. |
| `/programs`, `/courses`, `/members`, `/achievements` | `ProtectedRoute` + `AdminRoute` (`isAdmin === true`) | Whitelisted admins & `ADMIN_NPM_LIST` superadmins | **Utilitarian Admin Backoffice (No Fun Banner):** Direct, concise English labels, compact primitive filter bar (`SearchInput` + `Select`), dense primitive `Table`, icon action buttons, and standard `FormDialog` + `ConfirmDialog`. |

---

## 4. Lock Photo Feature & Data Model Specification

### Problem
In [`ImageUploadEditor.tsx`](file:///home/antigravity/VickyIbr/CSUI26/apps/frontend/src/components/patterns/ImageUploadEditor.tsx), pointer drag handlers (`onPointerDown`, `onPointerMove`, `onPointerUp`) and `touch-none` are permanently attached whenever an image exists. On touchscreens and trackpads, scrolling across `/my-profile` or tapping the photo accidentally shifts `config.x` / `config.y` or triggers unwanted image swipes.

### Solution (Client-Side Gesture & Swipe Lock — Zero DB Migration)
1. **Backward-Compatible Data Contract (`@zenith/shared`):**
   - Retains existing `MemberFotoSchema` (`{ url: string, config?: { x, y, zoom, rotate, aspect: '1:1' } }`). Zero PostgreSQL schema migration required.
2. **Default Locked State (`isLocked = true`):**
   - Whenever an existing saved photo (`value.url` without an active `pendingFileUrl`) is rendered, `isLocked` defaults to `true`.
   - When `isLocked === true`:
     - Container sets `touch-action: pan-y` (`touch-pan-y cursor-default`) so vertical page scrolling passes through smoothly without hijacking touch gestures.
     - Pointer drag/pan (`handlePointerDown`/`Move`/`End`), zoom slider, rotate buttons, and photo preset/gallery swiping are disabled.
     - Attempting to drag or swipe while locked flashes a non-intrusive inline shield hint: *"Photo is locked to prevent accidental swipe. Tap Unlock to adjust."*
3. **Explicit Unlock & Auto-Lock Lifecycle:**
   - Selecting a newly uploaded file (`handleFileChange`) automatically sets `isLocked = false` so the user can immediately frame their new photo.
   - An accessible Radix `Toggle` / `Switch` pill button (`aria-pressed={isLocked}`, min `44x44px` touch target) sits on the top-right corner of the photo stage (`Lock Photo` / `Unlock to Crop`).
   - Clicking **Save photo** (`handleCommitCurrent`) or **Apply & upload** (`handleApplyUpload`) automatically re-engages `isLocked = true` after commit succeeds.

---

## 5. Scalable Primitive Library Architecture

All UI components must compose from `apps/frontend/src/components/ui/*` (Radix UI + `shadcn/ui`) and `apps/frontend/src/components/patterns/*`:

1. **Core Primitives (`components/ui/*`):**
   - Existing: `Button`, `Card`, `Table`, `Dialog`, `Sheet`, `Tabs`, `Select`, `Input`, `Textarea`, `Label`, `Field`, `Badge`, `Avatar`, `DropdownMenu`, `Tooltip`, `Sidebar`, `Pagination`, `Separator`, `Skeleton`.
   - New Radix Primitives to Add:
     - `Slider` (`@radix-ui/react-slider` via `radix-ui` package) — replaces raw `<input type="range">` in `ImageUploadEditor.tsx` for zoom and fine rotation.
     - `Switch` / `Toggle` (`@radix-ui/react-switch` / `@radix-ui/react-toggle` via `radix-ui` package) — powers the `Lock Photo` toggle control and view switches with full keyboard and ARIA support.
2. **Domain Pattern Primitives (`components/patterns/*`):**
   - `ProfileShowcaseCard` — Reusable `zenith.csui.dev/members/:slug` 1:1 photo + glassmorphic details card used for both the owner's live preview on `/my-profile` and the peer detail modal in the cohort discovery rail.
   - `ImageUploadEditor` (Upgraded) — Integrates the `Lock Photo` state machine, gesture shield, and Radix `Slider` / `Toggle` primitives.
   - `AdminDataTable` — Generic, high-density table wrapper built on `components/ui/table.tsx` + `ListState` + `Paginator` for `/programs`, `/courses`, `/members`, and `/achievements`.

---

## 6. In-Scope vs. Out-of-Scope

### In-Scope
- **Theme & Design System (`apps/frontend/DESIGN.md`, `apps/frontend/src/index.css`):**
  - Upgrade semantic tokens to dark-first Zenith Obsidian (`#030007`, `#0b0f19`, `#0011ff`, `#4888ff`, `#ff0000` ambient radial backdrop, glassmorphic surface utilities, `850 italic` display typography) while preserving a clean light-mode toggle.
- **Public-Cohort (Whitelisted SSO-UI) `/my-profile` Rebuild (`apps/frontend/src/features/members/MyProfilePage.tsx`):**
  - Social / e-commerce showcase layout with live 1:1 photo card, glassmorphic details box, split `niche` tag pills, pinned quote card, social links, collapsible/tabbed Profile Studio editor (`PUT /api/v1/members/me`), and cohort discovery feed (`GET /api/v1/members`).
- **Lock Photo Feature (`apps/frontend/src/components/patterns/ImageUploadEditor.tsx`):**
  - Default-locked photo frame (`touch-action: pan-y`), explicit Lock/Unlock toggle pill, gesture shield feedback on accidental drag/swipe, auto-unlock on new file selection, and auto-lock on save.
- **Radix + `shadcn/ui` Primitive Expansion (`apps/frontend/src/components/ui/` & `patterns/`):**
  - Add Radix `Slider` and `Toggle`/`Switch` primitives, `ProfileShowcaseCard`, and `AdminDataTable`.
- **Utilitarian Admin Routes (`ProgramsPage.tsx`, `CoursesPage.tsx`, `MembersPage.tsx`, `AchievementsPage.tsx`):**
  - Simplify admin-only views into compact, dense `AdminDataTable` rows with fast filter bars, keyboard shortcuts (`n`, `/`), and existing `FormDialog` + `ConfirmDialog` modals.
- **Vitest Unit & Component Tests (`apps/frontend/src/**/*.test.tsx`):**
  - Add tests covering `ImageUploadEditor` Lock Photo gesture blocking/unlocking, `/my-profile` showcase & edit flow, and simplified admin table rendering.

### Out-of-Scope
- Changing backend Fastify route URLs, JWT/CAS authentication middleware, or SSO-UI whitelist rules (`ProtectedRoute` and `AdminRoute` boundaries remain unchanged).
- PostgreSQL schema changes or Drizzle database migrations (`MemberFotoSchema` and `ImageConfigSchema` remain 100% backward-compatible).
- Multi-image gallery storage in S3/MinIO (each member continues to store one primary `foto` object in PostgreSQL).
- Unauthenticated public internet access to `/my-profile` (the static Astro landing site at `zenith.csui.dev` handles unauthenticated public traffic; this app's `/my-profile` serves whitelisted SSO-UI members).
