import { describe, expect, it } from 'vitest';
import {
  ADMIN_SUB_ROUTES,
  findNavItem,
  isAdminSubRoute,
  isNavItemActive,
  navItems,
} from '@/app/navigation';

describe('navigation', () => {
  it('exposes exactly 3 member items and 1 Admin Hub item without directory or edit profile', () => {
    expect(navItems.map((item) => item.to)).toEqual([
      '/my-profile',
      '/content-requests',
      '/feedback',
      '/admin',
    ]);
    expect(navItems.some((item) => item.to === '/directory')).toBe(false);
    expect(navItems.some((item) => item.to === '/my-profile/edit')).toBe(false);
  });

  it('keeps Profilku active on /my-profile/edit via prefix matching', () => {
    const profile = navItems[0];
    expect(isNavItemActive('/my-profile', profile)).toBe(true);
    expect(isNavItemActive('/my-profile/edit', profile)).toBe(true);
    expect(isNavItemActive('/content-requests', profile)).toBe(false);
  });

  it('resolves member items and Admin Hub across /admin and all 7 admin sub-routes', () => {
    expect(findNavItem('/my-profile')?.label).toBe('Profilku');
    expect(findNavItem('/my-profile/edit')?.label).toBe('Profilku');
    expect(findNavItem('/content-requests')?.label).toBe('Permintaan Konten');
    expect(findNavItem('/content-requests')?.requireAdmin).toBeUndefined();
    expect(findNavItem('/feedback')?.label).toBe('Feedback & Bantuan');
    expect(findNavItem('/feedback')?.requireAdmin).toBeUndefined();
    expect(findNavItem('/admin')).toMatchObject({
      label: 'Admin Hub',
      requireAdmin: true,
    });

    for (const subRoute of ADMIN_SUB_ROUTES) {
      expect(findNavItem(subRoute)).toMatchObject({
        label: 'Admin Hub',
        requireAdmin: true,
      });
      expect(isAdminSubRoute(subRoute)).toBe(true);
    }

    expect(isAdminSubRoute('/admin')).toBe(false);
    expect(findNavItem('/directory')).toBeUndefined();
    expect(findNavItem('/halaman-tidak-ada')).toBeUndefined();
  });
});
