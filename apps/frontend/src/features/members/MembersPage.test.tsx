import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MembersPage from './MembersPage';
import { programsApi } from '@/features/programs/api';
import type { Member } from '@/features/members/types';
import type { Program } from '@/features/programs/types';
import * as apiModule from '@/lib/api';

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      npm: '2606123456',
      nama: 'Admin User',
      isAdmin: true,
      isWhitelisted: true,
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const MEMBERS_FIXTURE: Member[] = [
  {
    npm: '2606123456',
    email: 'baruna@ui.ac.id',
    name: 'Baruna Fandhika',
    nama_panggilan: 'Bar',
    major: 'Sistem Informasi',
    programId: 'si',
    instagram: 'baruna.ui',
    line: 'baruna26',
    github: 'barunaf',
    linkedin: 'baruna-fandhika',
    deskripsi: 'Product engineering student.',
    niche: 'Frontend Developer, UI/UX',
    quotes: 'Keep building.',
    foto: { url: '/api/v1/media/members/2606123456.webp' },
    role: 'user',
  },
];

const PROGRAMS_FIXTURE: Program[] = [
  {
    id: 'si',
    name: 'Sistem Informasi',
    slug: 'sistem-informasi',
    description: 'Sistem Informasi UI.',
    careers: [],
    courseMapUrl: '',
    driveUrl: '',
    semesters: [],
  },
];

describe('MembersPage', () => {
  beforeAll(() => {
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = () => false;
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = () => {};
    }
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(programsApi, 'list').mockResolvedValue({ data: PROGRAMS_FIXTURE });
    vi.spyOn(apiModule, 'api').mockResolvedValue({
      data: MEMBERS_FIXTURE,
      total: 1,
      page: 1,
      totalPages: 1,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders member rows in a dense primitive table and opens edit dialog', async () => {
    const user = userEvent.setup();
    render(<MembersPage />);

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText('2606123456')).toBeInTheDocument();
    expect(screen.getByText('Baruna Fandhika')).toBeInTheDocument();
    expect(screen.getByText('Bar')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer, UI/UX')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit Baruna Fandhika' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('passes anti-slop copy and button accessibility checks', async () => {
    render(<MembersPage />);
    await screen.findByRole('table');

    expect(document.body.textContent).not.toContain('—');

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      const accessibleText =
        button.getAttribute('aria-label')?.trim() || button.textContent?.trim() || '';
      expect(accessibleText.length).toBeGreaterThan(0);
    }
  });
});
