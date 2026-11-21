import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RequestThreadDetail, RequestThreadSummary } from '@zenith/shared';
import { AuthContext } from '@/features/auth/useAuth';
import type { AuthUser } from '@/features/auth/types';
import AdminRequestsPage from '@/features/requests/AdminRequestsPage';
import MemberRequestsPage from '@/features/requests/MemberRequestsPage';
import * as apiModule from '@/lib/api';

const MEMBER_USER: AuthUser = {
  nama: 'Budi Santoso',
  npm: '2606123456',
  role: 'user',
  isAdmin: false,
  isWhitelisted: true,
  isSuperAdmin: false,
};

const ADMIN_USER: AuthUser = {
  nama: 'Admin Zenith',
  npm: '2606888572',
  role: 'admin',
  isAdmin: true,
  isWhitelisted: true,
  isSuperAdmin: false,
};

const THREAD_SUMMARY_FIXTURE: RequestThreadSummary = {
  id: 42,
  authorNpm: MEMBER_USER.npm!,
  author: {
    npm: MEMBER_USER.npm!,
    name: MEMBER_USER.nama,
    nama_panggilan: 'Budi',
  },
  category: 'content',
  title: 'Request Prestasi Gemastik 2026',
  description: 'Tim ZenithSec meraih juara 2 bidang Keamanan Siber.',
  status: 'open',
  image: null,
  metadata: {
    contentType: 'achievement',
    year: 2026,
    teamName: 'ZenithSec',
  },
  messageCount: 1,
  createdAt: 1796000000,
  updatedAt: 1796000500,
};

const THREAD_DETAIL_FIXTURE: RequestThreadDetail = {
  ...THREAD_SUMMARY_FIXTURE,
  messages: [
    {
      id: 101,
      threadId: 42,
      authorNpm: MEMBER_USER.npm!,
      authorRole: 'user',
      author: THREAD_SUMMARY_FIXTURE.author,
      body: 'Mohon bantuannya untuk verifikasi sertifikat ya kak.',
      image: null,
      createdAt: 1796000200,
      updatedAt: 1796000200,
    },
  ],
};

function renderWithAuth(ui: React.ReactElement, user: AuthUser) {
  return render(
    <AuthContext.Provider
      value={{
        user,
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn().mockResolvedValue(undefined),
        refresh: vi.fn().mockResolvedValue(undefined),
        setSessionUser: vi.fn(),
      }}
    >
      {ui}
    </AuthContext.Provider>,
  );
}

function assertAntiSlopAndAccessibleButtons() {
  expect(document.body.textContent).not.toContain('—');
  expect(document.body.textContent).not.toContain('–');

  const buttons = screen.getAllByRole('button');
  for (const button of buttons) {
    const accessibleText =
      button.getAttribute('aria-label')?.trim() || button.textContent?.trim() || '';
    expect(accessibleText.length).toBeGreaterThan(0);
  }
}

describe('MemberRequestsPage & AdminRequestsPage', () => {
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
  });

  afterEach(() => {
    cleanup();
  });

  it('renders MemberRequestsPage Petunjuk cards, threads, and opens thread & create dialogs cleanly', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule, 'api').mockImplementation(async (path) => {
      if (path.startsWith('/requests/42')) {
        return { data: THREAD_DETAIL_FIXTURE };
      }
      return {
        data: [THREAD_SUMMARY_FIXTURE],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    });

    renderWithAuth(<MemberRequestsPage />, MEMBER_USER);

    expect(await screen.findByText('Request Prestasi Gemastik 2026')).toBeInTheDocument();
    expect(screen.getByText('1. Pilih Kategori yang Pas')).toBeInTheDocument();
    expect(screen.getByText('2. Lampirkan Foto & Info Pendukung')).toBeInTheDocument();
    expect(screen.getByText('3. Diskusi Privat Bareng Admin')).toBeInTheDocument();

    assertAntiSlopAndAccessibleButtons();

    await user.click(screen.getByRole('button', { name: 'Buka Diskusi' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText('Mohon bantuannya untuk verifikasi sertifikat ya kak.'),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Buat Request Baru' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Judul')).toBeInTheDocument();
  });

  it('renders AdminRequestsPage table, inspects thread, and passes anti-slop checks', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule, 'api').mockImplementation(async (path) => {
      if (path.startsWith('/requests/42')) {
        return { data: THREAD_DETAIL_FIXTURE };
      }
      return {
        data: [THREAD_SUMMARY_FIXTURE],
        total: 1,
        page: 1,
        limit: 15,
        totalPages: 1,
      };
    });

    renderWithAuth(<AdminRequestsPage />, ADMIN_USER);

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('Request for Content')).toBeInTheDocument();
    expect(screen.getByText('Achievement')).toBeInTheDocument();

    assertAntiSlopAndAccessibleButtons();

    await user.click(
      screen.getByRole('button', { name: 'Inspect thread Request Prestasi Gemastik 2026' }),
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Write a reply')).toBeInTheDocument();
  });
});
