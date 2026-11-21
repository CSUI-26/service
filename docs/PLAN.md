# CSUI Zenith Frontend UI/UX Rebuild (`@zenith/frontend`) Implementation Plan

> **For agentic workers:** Implement this plan task-by-task in sequential order. Every task modifies **at most 2 files** and concludes with an explicit, deterministic verification command. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `@zenith/frontend` (`apps/frontend`) to match the [`docs/PRD.md`](file:///home/antigravity/VickyIbr/CSUI26/docs/PRD.md) specification and the validated [`docs/index.html`](file:///home/antigravity/VickyIbr/CSUI26/docs/index.html) taste & UX prototype:
1. Dark-first Zenith Obsidian theme (`#05060d` canvas, `#0c101d` surface, `#12182b` elevated, `#3b82f6` cobalt primary, ambient cobalt/crimson aura) with light-mode support.
2. Sticky overflow-free header featuring the italic **`ZENITH`** wordmark on the left (no left logo icon) and an **icon-only Theme Toggle** placed to the left of a **right-aligned Dropdown Navigation Menu** on the right.
3. Separate **Preview Profile (`/my-profile` — "Profilku")**, **Edit Profile (`/my-profile/edit` — "Edit Profil")**, and **Cohort Directory (`/directory` — "Teman Angkatan")** pages with warm, position-agnostic Bahasa Indonesia tips and zero developer jargon.
4. Client-side **Lock Photo** protection in `ImageUploadEditor` and `ProfileShowcaseCard` (`touch-action: pan-y` by default so scrolling never shifts the crop or swipes photos).
5. Simplified, utilitarian Radix/shadcn primitive `Table` views for Admin routes (`/programs`, `/courses`, `/members`, `/achievements`).

**Tech Stack:** React 19, React Router (`react-router`), Vite, Tailwind CSS v4, `radix-ui`, `shadcn/ui`, `lucide-react`, `next-themes`, Vitest, Oxlint.

**References:**
- Product Requirements: [`docs/PRD.md`](file:///home/antigravity/VickyIbr/CSUI26/docs/PRD.md)
- Interactive UX & Visual Reference: [`docs/index.html`](file:///home/antigravity/VickyIbr/CSUI26/docs/index.html)

---

## Global Principles (`writing-plans`, `ponytail`, `ui-ux-pro-max`, `anti-slop`)

1. **Native Capabilities First (`ponytail`):**
   - Install **zero** new third-party npm packages. Use existing workspace primitives (`radix-ui`, `shadcn/ui` components in `apps/frontend/src/components/ui/*`, `lucide-react`, `next-themes`, `react-router`) and native browser APIs (`PointerEvent`, CSS `touch-action: pan-y`, `HTMLCanvasElement`, `CustomEvent`).
2. **Design Tokens & Typography Scale (`ui-ux-pro-max` & [`docs/index.html`](file:///home/antigravity/VickyIbr/CSUI26/docs/index.html)):**
   - **Dark Default (`.dark`):** `--background: #05060d`, `--foreground: #f8fafc`, `--card: #0c101d`, `--muted: #12182b`, `--muted-foreground: #94a3b8`, `--primary: #3b82f6`, `--border: rgba(255, 255, 255, 0.10)`.
   - **Light Toggle (`:root`):** `--background: #f8fafc`, `--foreground: #0f172a`, `--card: #ffffff`, `--muted: #f1f5f9`, `--muted-foreground: #475569`, `--primary: #2563eb`, `--border: #e2e8f0`.
   - **Typography Scale:**
     - Brand Wordmark (`.zenith-wordmark`): `font-style: italic; font-weight: 850; letter-spacing: -0.04em` with blue-white-red gradient clip.
     - Showcase Display Name: `text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight`
     - Page Heading: `text-xl sm:text-2xl font-bold tracking-tight`
     - Section / Card Title: `text-sm sm:text-base font-bold`
     - Body Copy: `text-xs sm:text-sm leading-relaxed`
     - Numerals & Codes (NPM, SKS, year, zoom/rotation): `font-mono tabular-nums` (`JetBrains Mono`)
3. **Anti-Slop Gates (`miqdadbadjuber/anti-slop`):**
   - **R-01 (Purposeful Surfaces):** Use `.zenith-aura` ambient radial backdrop and `.surface-card` glass panels on member showcase views; keep admin tables flat and high-density.
   - **R-02 (Zero Em-Dashes & Buzzwords):** Never use `—` or `–` in UI copy.
   - **R-03 (Accessible Affordances & Motion):** Every icon-only button (`ThemeToggle`, table `Edit`/`Delete`) must include an explicit `aria-label`. Transitions stay within `150ms–200ms` with `prefers-reduced-motion` support.
   - **R-04 (Zero Dev-Only or Directional Copy):** Never render developer-facing strings (such as `"NPM & Role locked by Auth"`, `"PUT /api/v1/members/me"`, `"AdminRoute"`, `"touch-action: pan-y"`, `"1:1 WebP"`) or position-dependent instructions (such as `"Klik tombol di kanan!"` or `"di atas"`). Reference buttons by their label (**Edit Profilku**, **Buka Kunci Foto**).
4. **Atomic Tasks (Max 2 Files per Task):**
   - Each task below modifies at most 2 files and ends with a deterministic verification command.

---

## File Map

- **Modify:**
  - `apps/frontend/DESIGN.md` — Update tokens, typography, header layout, and anti-slop rules to match `docs/index.html`.
  - `apps/frontend/src/index.css` — Add `.dark` Zenith Obsidian palette (`#05060d`, `#0c101d`, `#12182b`, `#3b82f6`) and `.zenith-aura` / `.zenith-wordmark` / `.surface-card` / `.surface-elevated` utilities.
  - `apps/frontend/src/app/providers.tsx` — Switch `ThemeProvider` default theme to `"dark"`.
  - `apps/frontend/src/app/navigation.ts` — Add `/my-profile` ("Profilku"), `/my-profile/edit` ("Edit Profil"), `/directory` ("Teman Angkatan"), and admin routes with subtitle descriptions.
  - `apps/frontend/src/app/navigation.test.ts` — Update unit tests for the new route table.
  - `apps/frontend/src/components/layout/AppHeader.tsx` — Left `ZENITH` wordmark (no logo) + right icon-only `ThemeToggle` (left of dropdown) + right-aligned `DropdownMenu` navigation.
  - `apps/frontend/src/components/layout/AppLayout.tsx` — Streamlined top-header layout with `.zenith-aura` backdrop and overflow-safe `max-w-6xl` container.
  - `apps/frontend/src/components/patterns/ImageUploadEditor.tsx` — Implement **Lock Photo** state (`isLocked`, `touch-action: pan-y`, **Buka Kunci Foto / Kunci Foto** toggle button, non-directional lock shield toast, auto-lock on save).
  - `apps/frontend/src/components/patterns/ImageUploadEditor.test.tsx` — Unit tests for Lock Photo default lock, blocked pointer drag, unlock editing, and auto-lock on commit.
  - `apps/frontend/src/features/members/MyProfilePage.tsx` — Dedicated Preview Profile page ("Profilku") with fun Bahasa Indonesia banner and `ProfileShowcaseCard`.
  - `apps/frontend/src/app/router.tsx` — Register `/my-profile/edit` (`EditProfilePage`) and `/directory` (`CohortDirectoryPage`) inside `ProtectedRoute`.
  - `apps/frontend/src/features/programs/ProgramsPage.tsx` — Simplify into a compact primitive `Table`.
  - `apps/frontend/src/features/courses/CoursesPage.tsx` — Simplify into a compact primitive `Table`.
  - `apps/frontend/src/features/members/MembersPage.tsx` — Simplify admin member directory into a compact primitive `Table`.
- **Create:**
  - `apps/frontend/src/features/members/ProfileShowcaseCard.tsx` — Reusable social/e-commerce showcase card with locked 1:1 photo stage, quote callout, interest pills, and platform-icon social buttons.
  - `apps/frontend/src/features/members/EditProfilePage.tsx` — Dedicated Edit Profile page (`/my-profile/edit`) with 3 fun Bahasa Indonesia tips cards + photo crop studio + profile form.
  - `apps/frontend/src/features/members/CohortDirectoryPage.tsx` — Dedicated Cohort Directory page (`/directory`) with fun Bahasa Indonesia guide, search/prodi filter pills, and classmate preview dialog.
  - `apps/frontend/src/features/members/MyProfilePage.test.tsx` — Integration tests for Preview Profile, Edit Profile tips, and anti-slop copy checks.
  - `apps/frontend/src/features/members/MembersPage.test.tsx` — Unit tests for the simplified admin members table.

---

### Task 1: Align `DESIGN.md` & `index.css` Tokens with `zenith.csui.dev` and `docs/index.html`

**Files (2):**
- Modify: `apps/frontend/DESIGN.md`
- Modify: `apps/frontend/src/index.css`

- [ ] **Step 1: Update `apps/frontend/DESIGN.md` with the dark-first Zenith Obsidian token table, header layout spec, and anti-slop rules (`R-01`–`R-04`)**
  - Document `.dark` default palette (`#05060d` background, `#0c101d` card, `#12182b` muted/elevated, `#3b82f6` primary) and `:root` light palette (`#f8fafc` background, `#ffffff` card, `#f1f5f9` muted, `#2563eb` primary).
  - Document the sticky top header rule: `ZENITH` wordmark on the left (no logo icon), icon-only `ThemeToggle` + right-aligned `DropdownMenu` navigation on the right.
  - Document copy rules: fun Bahasa Indonesia instructions on non-admin member pages, concise English on admin tables, zero dev-only text, and zero directional instructions.

- [ ] **Step 2: Update `apps/frontend/src/index.css` with Zenith Obsidian tokens and `.zenith-aura`, `.zenith-wordmark`, `.surface-card`, `.surface-elevated` utilities**
  - Update `.dark` variables:
    ```css
    .dark {
      --background: #05060d;
      --foreground: #f8fafc;
      --card: #0c101d;
      --card-foreground: #f8fafc;
      --popover: #0c101d;
      --popover-foreground: #f8fafc;
      --primary: #3b82f6;
      --primary-foreground: #ffffff;
      --secondary: #12182b;
      --secondary-foreground: #f8fafc;
      --muted: #12182b;
      --muted-foreground: #94a3b8;
      --accent: #12182b;
      --accent-foreground: #60a5fa;
      --destructive: #ef4444;
      --border: rgba(255, 255, 255, 0.1);
      --input: rgba(255, 255, 255, 0.12);
      --ring: #3b82f6;
    }
    ```
  - Add utility classes `.zenith-aura`, `.zenith-wordmark`, `.surface-card`, and `.surface-elevated` matching [`docs/index.html`](file:///home/antigravity/VickyIbr/CSUI26/docs/index.html).

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run build
  ```

---

### Task 2: Set Dark Theme as Default & Configure Navigation Metadata

**Files (2):**
- Modify: `apps/frontend/src/app/providers.tsx`
- Modify: `apps/frontend/src/app/navigation.ts`

- [ ] **Step 1: Set `defaultTheme="dark"` in `apps/frontend/src/app/providers.tsx`**
  - Update `<ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>`.

- [ ] **Step 2: Update `apps/frontend/src/app/navigation.ts` with member and admin navigation items**
  - Export `NavItem` with `to`, `label`, `description`, `icon`, `end`, and `requireAdmin`:
    - `{ to: '/my-profile', label: 'Profilku', description: 'Lihat tampilan kartu profil', icon: User, end: true }`
    - `{ to: '/my-profile/edit', label: 'Edit Profil', description: 'Ubah bio, foto & sosmed', icon: Pencil, end: true }`
    - `{ to: '/directory', label: 'Teman Angkatan', description: 'Jelajahi direktori Zenith 2026', icon: Users, end: true }`
    - `{ to: '/programs', label: 'Study Programs', description: 'Manage study programs', icon: GraduationCap, requireAdmin: true }`
    - `{ to: '/courses', label: 'Courses', description: 'Manage curriculum courses', icon: BookOpen, requireAdmin: true }`
    - `{ to: '/members', label: 'Members (Admin)', description: 'Manage member records & roles', icon: Users, requireAdmin: true }`
    - `{ to: '/achievements', label: 'Achievements', description: 'Manage featured & yearly awards', icon: Trophy, requireAdmin: true }`

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 3: Update Navigation Unit Tests

**Files (1):**
- Modify: `apps/frontend/src/app/navigation.test.ts`

- [ ] **Step 1: Update `apps/frontend/src/app/navigation.test.ts` to cover `/my-profile`, `/my-profile/edit`, `/directory`, and admin routes**
  - Verify `isNavItemActive('/my-profile', navItems[0])` is `true` and `isNavItemActive('/my-profile/edit', navItems[0])` is `false` (because `end: true`).
  - Verify `findNavItem('/my-profile/edit')?.label === 'Edit Profil'` and `findNavItem('/directory')?.label === 'Teman Angkatan'`.

- [ ] **Step 2: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend test -- src/app/navigation.test.ts
  ```

---

### Task 4: Build Wordmark-Only Sticky Header with Icon-Only Theme Toggle & Right-Aligned Dropdown Navigation

**Files (2):**
- Modify: `apps/frontend/src/components/layout/AppHeader.tsx`
- Modify: `apps/frontend/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Rebuild `apps/frontend/src/components/layout/AppHeader.tsx` matching `docs/index.html`**
  - **Left side:** Link to `/my-profile` displaying only `<span className="zenith-wordmark text-xl tracking-tight pr-1 select-none">ZENITH</span>` (no left icon/logo).
  - **Right side:**
    1. Icon-only `<ThemeToggle />` button on the left of the dropdown (`aria-label` preserved).
    2. Right-aligned `<DropdownMenu>` trigger button showing the current active route's icon, label (e.g., `Profilku`), and a `ChevronDown` icon.
    3. `<DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">` listing member pages (**Profilku**, **Edit Profil**, **Teman Angkatan**), a separator + admin section when `user?.isAdmin` is true, and a bottom **Keluar / Log out** item calling `logout()`.

- [ ] **Step 2: Simplify `apps/frontend/src/components/layout/AppLayout.tsx` to use the top-header shell + `.zenith-aura`**
  - Remove `<AppSidebar />` and `<SidebarProvider>` wrapper from `AppLayout.tsx` so the app uses the clean, overflow-free sticky top header + `<div className="zenith-aura" aria-hidden="true" />` and `<main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">`.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 5: Add Lock Photo Gesture Protection to `ImageUploadEditor` & Update Unit Tests

**Files (2):**
- Modify: `apps/frontend/src/components/patterns/ImageUploadEditor.tsx`
- Modify: `apps/frontend/src/components/patterns/ImageUploadEditor.test.tsx`

- [ ] **Step 1: Implement Client-Side Lock Photo in `apps/frontend/src/components/patterns/ImageUploadEditor.tsx`**
  - Add state:
    - `const [isLocked, setIsLocked] = useState<boolean>(() => Boolean(value.url));`
    - `const [showLockHint, setShowLockHint] = useState(false);`
  - Sync lock state when `value.url` loads asynchronously (if `!pendingFileUrl && value.url` transitions from empty to non-empty, set `isLocked(true)`).
  - When a new file is selected in `handleFileChange`, automatically set `setIsLocked(false)` so the user can crop immediately.
  - When `previewSrc` is present:
    - Render a top overlay bar inside the 1:1 photo stage with:
      - Status pill: `Terkunci` (emerald dot) when `isLocked`, or `Terbuka` (amber pulsing dot) when unlocked.
      - Toggle button (`type="button"`, `aria-pressed={isLocked}`, `aria-label={isLocked ? 'Buka Kunci Foto' : 'Kunci Foto'}`): displays `Lock` / `Unlock` icon + label `Buka Kunci Foto` (when locked) or `Kunci Foto` (when unlocked).
    - When `isLocked === true`:
      - Set `style={{ aspectRatio: aspectToCss(activeConfig.aspect), touchAction: 'pan-y' }}` and `cursor-default`.
      - If the user triggers `onPointerDown` on the image container (outside buttons), do **not** start dragging; instead flash `showLockHint = true` for `1500ms` showing the non-directional overlay: *"Foto masih dikunci. Tekan Buka Kunci Foto untuk mengatur posisi."*
      - Hide/disable the zoom slider, rotation slider, 90-degree rotate button, and reset button so the interface stays clean and accidental touches cannot alter `config`.
    - When `isLocked === false`:
      - Enable `handlePointerDown` / `handlePointerMove` / `handlePointerEnd` with `touch-none cursor-grab`.
      - Show the zoom, rotation, and reset controls.
    - When `handleApplyUpload()` or `handleCommitCurrent()` succeeds, automatically set `setIsLocked(true)`.

- [ ] **Step 2: Update `apps/frontend/src/components/patterns/ImageUploadEditor.test.tsx`**
  - Test that when initialized with a saved `value.url`, the photo starts locked (`aria-pressed="true"`, button `Buka Kunci Foto`), dragging does not fire `onChange`, and the lock hint alert appears.
  - Test that clicking `Buka Kunci Foto` unlocks the editor, reveals `Zoom image`, `Rotate 90 degrees`, `Fine rotation`, and `Reset position`, allows pointer drag to update `x`/`y`, and auto-locks after clicking `Save photo`.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend test -- src/components/patterns/ImageUploadEditor.test.tsx
  ```

---

### Task 6: Create `ProfileShowcaseCard` & Rebuild Dedicated Preview Page (`MyProfilePage.tsx`)

**Files (2):**
- Create: `apps/frontend/src/features/members/ProfileShowcaseCard.tsx`
- Modify: `apps/frontend/src/features/members/MyProfilePage.tsx`

- [ ] **Step 1: Create `apps/frontend/src/features/members/ProfileShowcaseCard.tsx` matching `docs/index.html` Page 1**
  - Accepts `member: Partial<Member> & { npm?: string; programName?: string }` and optional `isOwner?: boolean`.
  - **Left column (1:1 Locked Photo Stage):**
    - Renders the member's 1:1 photo with `objectPosition` and `transform` derived from `member.foto?.config`, `style={{ touchAction: 'pan-y' }}`.
    - Top-left pill badge with `Lock` icon + `"Foto Terkunci"`.
    - Tapping/dragging the photo stage flashes the non-directional hint overlay: *"Foto sedang dikunci. Buka menu Edit Profil untuk mengatur posisi foto."*
  - **Right column (Member Details):**
    - Study program pill (`GraduationCap` icon + major/program name) + monospace NPM pill.
    - Display name (`h1` / `h2`), nickname with `Sparkles` icon, and email with `Mail` icon (if present).
    - Bio paragraph (`deskripsi`).
    - `Quotes Andalan` callout card (`Quote` icon + italic quote).
    - `Minat & Niche` section (`Tag` icon + comma-split `niche` pills).
    - Social links bar (`Instagram`, `GitHub`, `LinkedIn`, `LINE`) using `openSocialLink` / `getSocialLinkHref` from `socialLinks.ts`.

- [ ] **Step 2: Rebuild `apps/frontend/src/features/members/MyProfilePage.tsx` as the Dedicated Preview Page ("Profilku")**
  - Fetches the logged-in member's profile (`membersApi.get(user.npm)`) and study programs (`programsApi.list()`).
  - Renders the friendly, position-agnostic Bahasa Indonesia banner from `docs/index.html`:
    - Title: *"Ini tampilan kartu profilmu di direktori Zenith!"*
    - Description: *"Biar makin gampang dikenal teman satu angkatan, kamu bisa lengkapi bio, minat, dan sosmedmu lewat Edit Profilku."*
    - Action button: `<Button asChild><Link to="/my-profile/edit"><Pencil /> Edit Profilku</Link></Button>`
  - Renders `<ProfileShowcaseCard member={...} isOwner />`.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 7: Create Dedicated Edit Profile Page (`EditProfilePage.tsx`) & Cohort Directory Page (`CohortDirectoryPage.tsx`)

**Files (2):**
- Create: `apps/frontend/src/features/members/EditProfilePage.tsx`
- Create: `apps/frontend/src/features/members/CohortDirectoryPage.tsx`

- [ ] **Step 1: Create `apps/frontend/src/features/members/EditProfilePage.tsx` matching `docs/index.html` Page 2**
  - Header: *"Poles Kartu Profilmu!"* + *"Bikin teman-teman satu angkatan gampang kenal dan ngajak kamu kolaborasi."* + **Lihat Hasil Kartu** button linking to `/my-profile`.
  - **3 Fun Position-Agnostic Bahasa Indonesia Tips Cards:**
    1. *1. Fitur Kunci Foto* — *"Mau atur zoom atau geser posisi wajahmu? Tekan tombol Buka Kunci Foto terlebih dahulu, lalu kunci kembali setelah selesai."*
    2. *2. Tips Niche & Minat* — *"Pisahkan minatmu pakai tanda koma (contoh: Game Dev, UI/UX, CTF). Nanti otomatis tampil jadi badge keren!"*
    3. *3. Quotes & Sosial Media* — *"Tulis satu kalimat andalanmu di bagian Quotes, dan cukup ketik username sosmedmu saja tanpa perlu salin link panjang."*
  - **12-Column Responsive Studio:**
    - Left (5 cols): `ImageUploadEditor` (`endpoint="/upload/avatar"`, `onCommit={handleCommitPhoto}`).
    - Right (7 cols): Form fields (`Nama Lengkap`, `Nama Panggilan`, `Program Studi` Radix `Select`, `Email Aktif`, `Minat & Niche`, `Cerita Singkat Tentangmu (Bio)`, `Quotes Andalan`, and `SocialLinkField` inputs for Instagram, LINE, GitHub, LinkedIn).
    - Submit button: **Simpan & Lihat Kartu** (`PUT /api/v1/members/me`, emits `zenith:profile-updated`, shows `toast.success('Profil berhasil diperbarui')`, and navigates to `/my-profile`).

- [ ] **Step 2: Create `apps/frontend/src/features/members/CohortDirectoryPage.tsx` matching `docs/index.html` Page 3**
  - Uses `useResourceList<Member>({ path: '/members', pageSize: 16, filters: { search, program: programFilter } })`.
  - Fun Bahasa Indonesia header banner:
    - Title: *"Kenalan sama teman-teman Zenith 2026 yuk!"*
    - Description: *"Cari berdasarkan minat seperti \"Game Dev\" atau \"Cyber Security\" buat nemu partner lomba, belajar bareng, atau mabar."*
    - Search input (`Cari nama atau minat...`) + study program filter pills (`Semua` + loaded programs).
  - Grid of classmate cards showing avatar thumbnail, nickname, major badge, full name, NPM, and top 3 comma-split niche pills.
  - Clicking a classmate card opens a `Dialog` displaying their full `<ProfileShowcaseCard />`.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 8: Wire New Routes in `router.tsx` & Add Member Pages Unit Tests

**Files (2):**
- Modify: `apps/frontend/src/app/router.tsx`
- Create: `apps/frontend/src/features/members/MyProfilePage.test.tsx`

- [ ] **Step 1: Register `/my-profile/edit` and `/directory` inside `ProtectedRoute` in `apps/frontend/src/app/router.tsx`**
  - Lazy-load `EditProfilePage` (`@/features/members/EditProfilePage`) and `CohortDirectoryPage` (`@/features/members/CohortDirectoryPage`).
  - Add `<Route path="my-profile/edit" element={<EditProfilePage />} />` and `<Route path="directory" element={<CohortDirectoryPage />} />`.

- [ ] **Step 2: Create `apps/frontend/src/features/members/MyProfilePage.test.tsx`**
  - Verify `MyProfilePage` renders the member's showcase card, `Foto Terkunci` status badge, comma-split niche pills, `Edit Profilku` link to `/my-profile/edit`, and contains zero dev jargon (`"NPM & Role locked by Auth"`, `"PUT /api/v1/members/me"`) and zero directional instructions (`"Klik tombol di kanan"`).
  - Verify `EditProfilePage` renders the 3 Bahasa Indonesia tip cards and submits updates via `membersApi.updateMe`.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend test -- src/features/members/MyProfilePage.test.tsx
  ```

---

### Task 9: Simplify Admin `/programs` & `/courses` Pages into Utilitarian Primitive Tables

**Files (2):**
- Modify: `apps/frontend/src/features/programs/ProgramsPage.tsx`
- Modify: `apps/frontend/src/features/courses/CoursesPage.tsx`

- [ ] **Step 1: Replace the card grid in `apps/frontend/src/features/programs/ProgramsPage.tsx` with a dense primitive `Table`**
  - Render `<Table>` (`TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` from `@/components/ui/table`) with columns: **ID**, **Name**, **Slug**, **Semesters**, **Courses Link**, and right-aligned icon-only **Edit** (`aria-label="Edit <name>"`) and **Delete** (`aria-label="Delete <name>"`) buttons.
  - Fix the mixed-language typo `"Press n untuk menambah."` to `"Press n to add."`.
  - Keep `ProgramFormDialog` and `ConfirmDialog` intact.

- [ ] **Step 2: Replace `CourseRowCard` stack in `apps/frontend/src/features/courses/CoursesPage.tsx` with a dense primitive `Table`**
  - Render `<Table>` matching `docs/index.html` Page 4 with columns: **Code** (`font-mono tabular-nums`), **Course Name**, **Study Program**, **Term** (`font-mono tabular-nums`), **Credits** (`<sks> SKS`, `font-mono tabular-nums`), and right-aligned icon-only **Edit** / **Delete** buttons.
  - Keep the compact filter bar (`SearchInput`, Program `Select`, Semester `Input`, SKS `Select`), `Paginator`, `CourseFormDialog`, and `ConfirmDialog`.

- [ ] **Step 3: Deterministic Verification**
  ```bash
  pnpm --filter @zenith/frontend run lint
  ```

---

### Task 10: Simplify Admin `/members` Page into Utilitarian Primitive Table & Verify Full Suite

**Files (2):**
- Modify: `apps/frontend/src/features/members/MembersPage.tsx`
- Create: `apps/frontend/src/features/members/MembersPage.test.tsx`

- [ ] **Step 1: Replace `MemberCard` grid in `apps/frontend/src/features/members/MembersPage.tsx` with a dense primitive `Table`**
  - Render `<Table>` with columns: **NPM** (`font-mono tabular-nums`), **Name** (with small `MemberAvatar`), **Nickname**, **Study Program**, **Niche**, and right-aligned icon-only **Edit** (`aria-label="Edit <name>"`) and **Delete** (`aria-label="Delete <name>"`) buttons.
  - Keep `SearchInput`, Program `Select`, `Paginator`, `MemberFormDialog`, and `ConfirmDialog`.

- [ ] **Step 2: Create `apps/frontend/src/features/members/MembersPage.test.tsx`**
  - Test that the admin `MembersPage` renders member rows in a `<table>`, supports opening the edit dialog via `Edit <name>`, and passes anti-slop checks (zero em-dashes, accessible labels on all buttons).

- [ ] **Step 3: Full Monorepo Frontend Verification (Test, Lint, Build)**
  ```bash
  pnpm --filter @zenith/frontend test && pnpm --filter @zenith/frontend run lint && pnpm --filter @zenith/frontend run build
  ```
