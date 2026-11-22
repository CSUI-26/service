import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  ContentRequestDetail,
  ContentRequestSummary,
  FeedbackThreadDetail,
  FeedbackThreadSummary,
} from '@zenith/shared';
import { AuthContext } from '@/features/auth/useAuth';
import type { AuthUser } from '@/features/auth/types';
import ContentRequestsPage from '@/features/content-requests/ContentRequestsPage';
import FeedbackPage from '@/features/feedback/FeedbackPage';
import AdminRequestsPage from '@/features/requests/AdminRequestsPage';
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

const CONTENT_SUMMARY: ContentRequestSummary = {
  id: 42,
  authorNpm: MEMBER_USER.npm!,
  author: {
    npm: MEMBER_USER.npm!,
    name: MEMBER_USER.nama,
    nama_panggilan: 'Budi',
  },
  contentType: 'achievement',
  title: 'Request Prestasi Gemastik 2026',
  description: 'Tim ZenithSec meraih juara 2 bidang Keamanan Siber.',
  status: 'open',
  image: null,
  messageCount: 1,
  createdAt: 1796000000,
  updatedAt: 1796000500,
};

const CONTENT_DETAIL: ContentRequestDetail = {
  ...CONTENT_SUMMARY,
  messages: [
    {
      id: 101,
      requestId: 42,
      authorNpm: MEMBER_USER.npm!,
      authorRole: 'user',
      author: CONTENT_SUMMARY.author,
      body: 'Mohon bantuannya untuk verifikasi sertifikat.',
      image: null,
      createdAt: 1796000200,
      updatedAt: 1796000200,
    },
  ],
};

const FEEDBACK_SUMMARY: FeedbackThreadSummary = {
  id: 77,
  authorNpm: MEMBER_USER.npm!,
  author: CONTENT_SUMMARY.author,
  category: 'help',
  title: 'Kendala Akses Profil',
  description: 'Mohon bantu cek email SSO saya.',
  status: 'in_progress',
  image: null,
  externalUrl: 'https://example.com/issue',
  messageCount: 1,
  createdAt: 1796001000,
  updatedAt: 1796001500,
};

const FEEDBACK_DETAIL: FeedbackThreadDetail = {
  ...FEEDBACK_SUMMARY,
  messages: [
    {
      id: 201,
      threadId: 77,
      authorNpm: ADMIN_USER.npm!,
      authorRole: 'admin',
      author: { npm: ADMIN_USER.npm!, name: ADMIN_USER.nama, nama_panggilan: 'Admin' },
      body: 'Sedang kami periksa.',
      image: null,
      createdAt: 1796001200,
      updatedAt: 1796001200,
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

describe('ContentRequestsPage, FeedbackPage & AdminRequestsPage', () => {
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

  it('renders simplified ContentRequestFormDialog with dynamic per-type Detail Konten instructions and no metadata fields', async () => {
    const user = userEvent.setup();
    const apiSpy = vi.spyOn(apiModule, 'api').mockImplementation(async (path, init) => {
      if (init?.method === 'POST' && path === '/content-requests') {
        return { data: CONTENT_DETAIL };
      }
      if (path.startsWith('/content-requests/42')) {
        return { data: CONTENT_DETAIL };
      }
      return {
        data: [CONTENT_SUMMARY],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    });

    renderWithAuth(<ContentRequestsPage />, MEMBER_USER);

    expect(await screen.findByText('Request Prestasi Gemastik 2026')).toBeInTheDocument();
    expect(screen.getByText('1. Pilih Jenis Konten')).toBeInTheDocument();
    assertAntiSlopAndAccessibleButtons();

    await user.click(screen.getByRole('button', { name: 'Ajukan Konten' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Tahun, Nama Tim, and separate Link Drive inputs must not be rendered
    expect(screen.queryByLabelText(/nama tim/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/tahun/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/link drive/i)).not.toBeInTheDocument();

    // Default Achievement instruction on Detail Konten
    expect(screen.getByText(/Petunjuk Achievement:/i)).toBeInTheDocument();
    expect(screen.getByText(/foto tambahan dan sertifikat/i)).toBeInTheDocument();

    // Switch to Galeri -> instruction updates for Gallery
    await user.click(screen.getByRole('combobox', { name: 'Jenis Konten' }));
    await user.click(await screen.findByRole('option', { name: 'Galeri' }));
    expect(screen.getByText(/Petunjuk Galeri:/i)).toBeInTheDocument();
    expect(screen.getByText(/link folder Google Drive di Detail Konten/i)).toBeInTheDocument();

    // Switch to Kegiatan -> instruction updates for Activity
    await user.click(screen.getByRole('combobox', { name: 'Jenis Konten' }));
    await user.click(await screen.findByRole('option', { name: 'Kegiatan' }));
    expect(screen.getByText(/Petunjuk Kegiatan:/i)).toBeInTheDocument();

    // Switch back to Achievement and submit clean payload
    await user.click(screen.getByRole('combobox', { name: 'Jenis Konten' }));
    await user.click(await screen.findByRole('option', { name: 'Achievement' }));

    fireEvent.change(screen.getByLabelText('Judul Konten'), {
      target: { value: 'Juara 1 Compfest 2026' },
    });
    fireEvent.change(screen.getByLabelText('Detail Konten'), {
      target: {
        value: 'Tim meraih juara 1 CTF 2026. Link Drive: https://drive.google.com/ctf',
      },
    });
    await user.click(screen.getByRole('button', { name: 'Kirim Permintaan' }));

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith(
        '/content-requests',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    const postCall = apiSpy.mock.calls.find(
      ([p, init]) => p === '/content-requests' && init?.method === 'POST',
    );
    const body = JSON.parse(String(postCall?.[1]?.body));
    expect(body).toEqual({
      contentType: 'achievement',
      title: 'Juara 1 Compfest 2026',
      description: 'Tim meraih juara 1 CTF 2026. Link Drive: https://drive.google.com/ctf',
      image: null,
    });
  });

  it('renders FeedbackPage, filters categories, and creates a thread via /feedback', async () => {
    const user = userEvent.setup();
    const apiSpy = vi.spyOn(apiModule, 'api').mockImplementation(async (path, init) => {
      if (init?.method === 'POST' && path === '/feedback') {
        return { data: FEEDBACK_DETAIL };
      }
      if (path.startsWith('/feedback/77')) {
        return { data: FEEDBACK_DETAIL };
      }
      return {
        data: [FEEDBACK_SUMMARY],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    });

    renderWithAuth(<FeedbackPage />, MEMBER_USER);

    expect(await screen.findByText('Kendala Akses Profil')).toBeInTheDocument();
    assertAntiSlopAndAccessibleButtons();

    await user.click(screen.getByRole('button', { name: 'Bantuan' }));
    await waitFor(() => {
      expect(apiSpy.mock.calls.some(([url]) => String(url).includes('category=help'))).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: 'Kirim Pesan Baru' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Judul'), {
      target: { value: 'Saran Fitur Baru' },
    });
    fireEvent.change(screen.getByLabelText('Detail Pesan'), {
      target: { value: 'Tambahkan filter tahun di galeri.' },
    });
    await user.click(screen.getByRole('button', { name: 'Kirim Pesan' }));

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith(
        '/feedback',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('renders two-tab AdminRequestsPage calling /content-requests and /feedback', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule, 'api').mockImplementation(async (path) => {
      if (path.startsWith('/content-requests/42')) {
        return { data: CONTENT_DETAIL };
      }
      if (path.startsWith('/content-requests')) {
        return {
          data: [CONTENT_SUMMARY],
          total: 1,
          page: 1,
          limit: 15,
          totalPages: 1,
        };
      }
      if (path.startsWith('/feedback/77')) {
        return { data: FEEDBACK_DETAIL };
      }
      return {
        data: [FEEDBACK_SUMMARY],
        total: 1,
        page: 1,
        limit: 15,
        totalPages: 1,
      };
    });

    renderWithAuth(<AdminRequestsPage />, ADMIN_USER);

    expect(await screen.findByText('Request Prestasi Gemastik 2026')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
    assertAntiSlopAndAccessibleButtons();

    await user.click(screen.getByRole('tab', { name: 'Feedback & Help' }));
    expect(await screen.findByText('Kendala Akses Profil')).toBeInTheDocument();
    expect(screen.getByText('#77')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Inspect thread Kendala Akses Profil' }),
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Sedang kami periksa.')).toBeInTheDocument();
  });
});
