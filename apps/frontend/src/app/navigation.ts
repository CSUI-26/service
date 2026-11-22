import {
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
  User,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  end?: boolean;
  requireAdmin?: boolean;
  matchPaths?: string[];
}

export const ADMIN_SUB_ROUTES = [
  '/programs',
  '/courses',
  '/members',
  '/achievements',
  '/gallery',
  '/activities',
  '/admin/requests',
] as const;

export const navItems: NavItem[] = [
  {
    to: '/my-profile',
    label: 'Profil',
    description: 'Lihat & atur kartu profil',
    icon: User,
    end: false,
  },
  {
    to: '/content-requests',
    label: 'Permintaan Konten',
    description: 'Ajukan prestasi, galeri & kegiatan',
    icon: Sparkles,
    end: true,
  },
  {
    to: '/feedback',
    label: 'Feedback & Bantuan',
    description: 'Kirim saran & minta bantuan admin',
    icon: MessageSquarePlus,
    end: true,
  },
  {
    to: '/admin',
    label: 'Admin Hub',
    description: 'Manage programs, members & inbox',
    icon: ShieldCheck,
    requireAdmin: true,
    matchPaths: [...ADMIN_SUB_ROUTES],
  },
];

function matchesPath(pathname: string, target: string, exact?: boolean): boolean {
  if (exact) return pathname === target;
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function isAdminSubRoute(pathname: string): boolean {
  return ADMIN_SUB_ROUTES.some((route) => matchesPath(pathname, route));
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (matchesPath(pathname, item.to, item.end)) return true;
  return Boolean(item.matchPaths?.some((prefix) => matchesPath(pathname, prefix)));
}

export function findNavItem(pathname: string): NavItem | undefined {
  return navItems.find((item) => isNavItemActive(pathname, item));
}
