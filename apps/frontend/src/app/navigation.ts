import {
  BookOpen,
  Calendar,
  GraduationCap,
  Images,
  Pencil,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  end?: boolean;
  requireAdmin?: boolean;
}

export const navItems: NavItem[] = [
  {
    to: '/my-profile',
    label: 'Profilku',
    description: 'Lihat tampilan kartu profil',
    icon: User,
    end: true,
  },
  {
    to: '/my-profile/edit',
    label: 'Edit Profil',
    description: 'Ubah bio, foto & sosmed',
    icon: Pencil,
    end: true,
  },
  {
    to: '/directory',
    label: 'Teman Angkatan',
    description: 'Jelajahi direktori Zenith 2026',
    icon: Users,
    end: true,
  },
  {
    to: '/programs',
    label: 'Study Programs',
    description: 'Manage study programs',
    icon: GraduationCap,
    requireAdmin: true,
  },
  {
    to: '/courses',
    label: 'Courses',
    description: 'Manage curriculum courses',
    icon: BookOpen,
    requireAdmin: true,
  },
  {
    to: '/members',
    label: 'Members (Admin)',
    description: 'Manage member records & roles',
    icon: Users,
    requireAdmin: true,
  },
  {
    to: '/achievements',
    label: 'Achievements',
    description: 'Manage featured & yearly awards',
    icon: Trophy,
    requireAdmin: true,
  },
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
];

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function findNavItem(pathname: string): NavItem | undefined {
  return navItems.find((item) => isNavItemActive(pathname, item));
}
