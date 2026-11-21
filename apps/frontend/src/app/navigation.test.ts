import { describe, expect, it } from 'vitest';
import { findNavItem, isNavItemActive, navItems } from '@/app/navigation';

describe('isNavItemActive', () => {
  const profile = navItems[0];

  it('matches exact path when end is true', () => {
    expect(isNavItemActive('/my-profile', profile)).toBe(true);
    expect(isNavItemActive('/my-profile/edit', profile)).toBe(false);
    expect(isNavItemActive('/programs', profile)).toBe(false);
  });

  it('matches child paths when end is not set', () => {
    const programs = navItems.find((item) => item.to === '/programs')!;
    expect(isNavItemActive('/programs', programs)).toBe(true);
    expect(isNavItemActive('/programs/123', programs)).toBe(true);
    expect(isNavItemActive('/courses', programs)).toBe(false);
  });
});

describe('findNavItem', () => {
  it('resolves member and admin navigation items by path', () => {
    expect(findNavItem('/my-profile')?.label).toBe('Profilku');
    expect(findNavItem('/my-profile/edit')?.label).toBe('Edit Profil');
    expect(findNavItem('/directory')?.label).toBe('Teman Angkatan');
    expect(findNavItem('/courses')?.label).toBe('Courses');
    expect(findNavItem('/gallery')).toMatchObject({ label: 'Gallery', requireAdmin: true });
    expect(findNavItem('/activities')).toMatchObject({ label: 'Activities', requireAdmin: true });
    expect(findNavItem('/halaman-tidak-ada')).toBeUndefined();
  });
});
