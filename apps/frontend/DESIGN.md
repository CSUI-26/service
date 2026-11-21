# DESIGN.md

Frontend design source of truth for CSUI Zenith (`zenith.csui.dev`). Built with `radix-ui`, `shadcn/ui`, and Tailwind CSS v4 semantic tokens.

## Theme

- Dark-first Zenith Obsidian (`.dark`), with high-contrast Slate light mode (`:root`) toggled via the icon-only header switch.
- Ambient cobalt and crimson radial backdrop (`.zenith-aura`) inspired by `zenith.csui.dev`, paired with clean glassmorphic showcase surfaces (`.surface-card`, `.surface-elevated`) and flat high-density admin tables.
- Style exclusively through semantic tokens and CSS utilities; never hardcode hex values in `.tsx` files.

## Colors

### Dark Default (`.dark`, Zenith Obsidian)
- background: `#05060d`
- foreground: `#f8fafc`
- card / popover: `#0c101d` (`rgba(12, 16, 29, 0.85)` glass on `.surface-card`)
- primary: `#3b82f6` (primary-foreground: `#ffffff`)
- secondary / muted / accent: `#12182b` (muted-foreground: `#94a3b8`, accent-foreground: `#60a5fa`)
- destructive: `#ef4444`
- border: `rgba(255, 255, 255, 0.1)`
- input: `rgba(255, 255, 255, 0.12)`
- ring: `#3b82f6`
- sidebar: `#0c101d` (sidebar-foreground: `#f8fafc`)

### Light (`:root`, Slate High-Contrast)
- background: `#f8fafc`
- foreground: `#0f172a`
- card / popover: `#ffffff` (`rgba(255, 255, 255, 0.92)` glass on `.surface-card`)
- primary: `#2563eb` (primary-foreground: `#ffffff`)
- secondary / muted: `#f1f5f9` (muted-foreground: `#475569`)
- accent: `#eff6ff` (accent-foreground: `#1d4ed8`)
- destructive: `#dc2626`
- border / input: `#e2e8f0`
- ring: `#2563eb`
- sidebar: `#ffffff` (sidebar-foreground: `#0f172a`)

## Typography

- Brand wordmark (`.zenith-wordmark`): `font-style: italic; font-weight: 850; letter-spacing: -0.04em` gradient text (`ZENITH`), displayed without a left logo icon.
- Headings (`h1`-`h4`): `Geist Variable` (`--font-heading`)
- UI Body: `Inter` (`--font-sans`)
- Numerals & Codes (NPM, years, SKS, crop zoom/rotation): `JetBrains Mono` (`--font-mono`, `tabular-nums`)
- Scale:
  - Showcase display name: `text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight`
  - Page title: `text-xl sm:text-2xl font-bold tracking-tight`
  - Section / card title: `text-sm sm:text-base font-bold`
  - Body: `text-xs sm:text-sm leading-relaxed`
  - Hint / Caption: `text-xs text-muted-foreground`

## Layout & Navigation

- Sticky top header (`h-14`, `max-w-6xl`): left `ZENITH` wordmark (no logo icon), right icon-only `ThemeToggle` positioned to the left of the right-aligned `DropdownMenu` navigation (`Profilku`, `Edit Profil`, `Teman Angkatan`, and admin routes for admins).
- Member pages (`/my-profile`, `/my-profile/edit`, `/directory`) use showcase/social cards with fun, position-agnostic Bahasa Indonesia instructions and tips.
- Admin routes (`/programs`, `/courses`, `/members`, `/achievements`) use dense utilitarian `Table` primitives and concise English copy without decorative banners.
- Async states: always render via `ListState` (`loading`, `error`, `empty`).

## Anti-Slop Gates

- **R-01 (Purposeful Surfaces):** Use `.zenith-aura` ambient radial backdrop and `.surface-card` / `.surface-elevated` surfaces on member showcase views; keep admin tables flat and compact.
- **R-02 (Direct, Non-Dev Copywriting):** Zero em-dashes or en-dashes in UI copy. Zero corporate buzzwords (such as "unlock", "elevate", "seamless", "robust", or "empower"). Never expose developer-only jargon or directional instructions (such as "di kanan" or "di atas"); reference controls by label.
- **R-03 (Accessible Affordances & Motion):** Functional transitions stay between `150ms` and `200ms`, wrapped with `prefers-reduced-motion` safeguards. All icon-only buttons require `aria-label`. Interactive controls meet `44x44px` touch targets on mobile.
- **R-04 (Code Hygiene):** No literal colors in `.tsx` components, no empty `catch` blocks, and no `window.confirm`.
