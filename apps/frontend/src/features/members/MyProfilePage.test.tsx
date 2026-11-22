import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import MyProfilePage from './MyProfilePage';
import EditProfilePage from './EditProfilePage';
import { membersApi } from '@/features/members/api';
import { programsApi } from '@/features/programs/api';
import type { Member } from '@/features/members/types';
import type { Program } from '@/features/programs/types';

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      npm: '2606123456',
      nama: 'Baruna Fandhika',
      isWhitelisted: true,
      isAdmin: false,
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const MEMBER_FIXTURE: Member = {
  npm: '2606123456',
  email: 'baruna@ui.ac.id',
  name: 'Baruna Fandhika',
  nama_panggilan: 'Baruna / Bar',
  major: 'Sistem Informasi',
  programId: 'si',
  instagram: 'baruna.ui',
  line: 'baruna26',
  github: 'barunaf',
  linkedin: 'baruna-fandhika',
  deskripsi: 'Mahasiswa Sistem Informasi UI yang suka ngulik product engineering.',
  niche: 'Frontend Developer, UI/UX Design',
  quotes: 'Konsistensi kecil setiap hari.',
  foto: {
    url: '/api/v1/media/members/2606123456.webp',
    config: { x: 50, y: 50, zoom: 1, rotate: 0, aspect: '1:1' },
  },
  role: 'user',
};

const PROGRAMS_FIXTURE: Program[] = [
  {
    id: 'si',
    name: 'Sistem Informasi',
    slug: 'sistem-informasi',
    description: 'Program studi Sistem Informasi.',
    careers: [],
    courseMapUrl: '',
    driveUrl: '',
    semesters: [],
  },
];

describe('MyProfilePage and EditProfilePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(programsApi, 'list').mockResolvedValue({ data: PROGRAMS_FIXTURE });
    vi.spyOn(membersApi, 'get').mockResolvedValue({ data: MEMBER_FIXTURE });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders dedicated preview showcase card with static photo and clean Bahasa Indonesia copy', async () => {
    render(
      <MemoryRouter initialEntries={['/my-profile']}>
        <Routes>
          <Route path="/my-profile" element={<MyProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Baruna Fandhika')).toBeInTheDocument();
    expect(screen.queryByText('Foto Terkunci')).not.toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('UI/UX Design')).toBeInTheDocument();

    const editLink = screen.getByRole('link', { name: /edit profilku/i });
    expect(editLink).toHaveAttribute('href', '/my-profile/edit');

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toContain('NPM & Role locked by Auth');
    expect(bodyText).not.toContain('PUT /api/v1/members/me');
    expect(bodyText).not.toContain('Klik tombol di kanan');
    expect(bodyText).not.toContain('—');
  });

  it('renders Bahasa Indonesia tips cards on EditProfilePage and submits updates via updateMe', async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(membersApi, 'updateMe').mockResolvedValue({
      data: { ...MEMBER_FIXTURE, nama_panggilan: 'Bar' },
    });

    render(
      <MemoryRouter initialEntries={['/my-profile/edit']}>
        <Routes>
          <Route path="/my-profile" element={<div>Halaman Profilku</div>} />
          <Route path="/my-profile/edit" element={<EditProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Baruna Fandhika')).toBeInTheDocument();
    expect(screen.getByText('1. Fitur Kunci Foto')).toBeInTheDocument();
    expect(screen.getByText('2. Tips Niche & Minat')).toBeInTheDocument();
    expect(screen.getByText('3. Quotes & Sosial Media')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nama Panggilan'), {
      target: { value: 'Bar' },
    });

    await user.click(screen.getByRole('button', { name: /simpan & lihat kartu/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Baruna Fandhika',
          nama_panggilan: 'Bar',
          programId: 'si',
        }),
      );
    });

    expect(await screen.findByText('Halaman Profilku')).toBeInTheDocument();
  });

  it('keeps dateOfBirth hidden and omits it from updateMe payload on save', async () => {
    const user = userEvent.setup();
    vi.spyOn(membersApi, 'get').mockResolvedValue({
      data: { ...MEMBER_FIXTURE, dateOfBirth: '2007-05-14' },
    });
    const updateSpy = vi.spyOn(membersApi, 'updateMe').mockResolvedValue({
      data: { ...MEMBER_FIXTURE, dateOfBirth: '2007-05-14' },
    });

    render(
      <MemoryRouter initialEntries={['/my-profile/edit']}>
        <Routes>
          <Route path="/my-profile" element={<div>Halaman Profilku</div>} />
          <Route path="/my-profile/edit" element={<EditProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Baruna Fandhika')).toBeInTheDocument();
    expect(screen.queryByLabelText(/tanggal lahir/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /simpan & lihat kartu/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });
    const submittedPayload = updateSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(submittedPayload).not.toHaveProperty('dateOfBirth');
  });
});
