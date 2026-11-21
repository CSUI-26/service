import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Activity, GalleryItem } from '@zenith/shared';
import GalleryPage from './GalleryPage';
import ActivitiesPage from '@/features/activities/ActivitiesPage';
import { activitiesApi } from '@/features/activities/api';
import * as apiModule from '@/lib/api';

const GALLERY_FIXTURE: GalleryItem[] = [
  {
    id: 'foto-angkatan-1',
    title: 'Foto Angkatan 1',
    alt: 'Mahasiswa CSUI 2026 berfoto di depan Rektorat UI.',
    category: 'photo',
    isFeatured: true,
    image: {
      url: '/images/gallery/foto-angkatan-1.jpg',
      config: { x: 50, y: 50, zoom: 1, aspect: '16:9' },
    },
    position: 0,
  },
  {
    id: 'racoon-1',
    title: 'Karakter Zenith 1',
    alt: 'Ilustrasi rakun Zenith.',
    category: 'hero',
    isFeatured: false,
    image: {
      url: '/images/gallery/heroes/Racoon1.png',
      config: { x: 50, y: 50, zoom: 1, aspect: '4:7' },
    },
    position: 1,
  },
];

const ACTIVITIES_FIXTURE: Activity[] = [
  {
    id: 'ddp0',
    title: 'DDP0',
    date: '',
    description: 'Latihan pemrograman dasar sebelum masuk kelas.',
    image: {
      url: '/images/about/highlight1.png',
      config: { x: 50, y: 50, zoom: 1, aspect: '16:9' },
    },
    position: 0,
  },
  {
    id: 'psaf',
    title: 'PSAF',
    date: '11-13 Agustus 2026',
    description: 'Pengenalan sistem akademik Fasilkom UI.',
    image: {
      url: '/images/about/highlight1.png',
      config: { x: 50, y: 50, zoom: 1, aspect: '16:9' },
    },
    position: 1,
  },
];

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

describe('GalleryPage & ActivitiesPage', () => {
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

  it('renders GalleryPage table rows, opens create dialog, and passes anti-slop checks', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule, 'api').mockResolvedValue({
      data: GALLERY_FIXTURE,
      total: 2,
      page: 1,
      totalPages: 1,
    });

    render(<GalleryPage />);

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText('foto-angkatan-1')).toBeInTheDocument();
    expect(screen.getByText('Foto Angkatan 1')).toBeInTheDocument();
    expect(screen.getByText('racoon-1')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();

    assertAntiSlopAndAccessibleButtons();

    await user.click(screen.getByRole('button', { name: 'Add item' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add gallery item')).toBeInTheDocument();
  });

  it('renders ActivitiesPage rows, opens create dialog, deletes via ConfirmDialog, and passes anti-slop checks', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule, 'api').mockResolvedValue({
      data: ACTIVITIES_FIXTURE,
      total: 2,
      page: 1,
      totalPages: 1,
    });
    const removeSpy = vi.spyOn(activitiesApi, 'remove').mockResolvedValue(undefined);

    render(<ActivitiesPage />);

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText('ddp0')).toBeInTheDocument();
    expect(screen.getByText('PSAF')).toBeInTheDocument();
    expect(screen.getByText('11-13 Agustus 2026')).toBeInTheDocument();

    assertAntiSlopAndAccessibleButtons();

    await user.click(screen.getByRole('button', { name: 'Add activity' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add activity', { selector: 'h2' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await user.click(screen.getByRole('button', { name: 'Delete PSAF' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete activity' }));
    expect(removeSpy).toHaveBeenCalledWith('psaf');
  });
});
