import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Achievement } from '@zenith/shared';
import AchievementsPage from './AchievementsPage';
import { achievementsApi } from '@/features/achievements/api';
import * as apiModule from '@/lib/api';

const ACHIEVEMENTS_FIXTURE: Achievement[] = [
  {
    id: 'ioai-2024',
    title: 'IOAI Silver Winner',
    award: 'SILVER',
    year: 2024,
    isFeatured: true,
    image: {
      url: '/images/achievements/ioai-winner.png',
      config: { x: 40, y: 60, zoom: 1.2, rotate: 0, aspect: '16:9' },
    },
    teamName: 'Team IOAI',
    members: ["Alice IK'26", "Bob SI'26"],
    description: 'International Olympiad in Artificial Intelligence medalist.',
    showOverlay: false,
    position: 0,
  },
  {
    id: 'gemastik-2030',
    title: 'GEMASTIK Gold',
    award: 'JUARA 1',
    year: 2030,
    isFeatured: false,
    image: {
      url: '/images/achievements/gemastik.png',
      config: { x: 50, y: 50, zoom: 1, rotate: 0, aspect: '16:9' },
    },
    teamName: 'Team Gemastik',
    members: ["Charlie SI'26"],
    description: 'Regular achievement with photo.',
    showOverlay: true,
    position: 1,
  },
  {
    id: 'compfest-2029',
    title: 'COMPFEST Finalist',
    award: '',
    year: 2029,
    isFeatured: false,
    image: { url: '' },
    teamName: '',
    members: [],
    description: '',
    showOverlay: true,
    position: 2,
  },
];

describe('AchievementsPage', () => {
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
    vi.spyOn(apiModule, 'api').mockResolvedValue({
      data: ACHIEVEMENTS_FIXTURE,
      total: ACHIEVEMENTS_FIXTURE.length,
      page: 1,
      limit: 12,
      totalPages: 1,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders unified table with image previews for both featured and regular achievements and highlights featured rows', async () => {
    render(<AchievementsPage />);

    expect(await screen.findByText('IOAI Silver Winner')).toBeInTheDocument();
    expect(screen.getByText('GEMASTIK Gold')).toBeInTheDocument();
    expect(screen.getByText('COMPFEST Finalist')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();

    const ioaiImg = screen.getByAltText('IOAI Silver Winner') as HTMLImageElement;
    expect(ioaiImg.style.objectPosition).toBe('40% 60%');
    expect(ioaiImg.style.transform).toBe('scale(1.2) rotate(0deg)');

    // Regular achievement can also render its own uploaded preview image
    const gemastikImg = screen.getByAltText('GEMASTIK Gold') as HTMLImageElement;
    expect(gemastikImg.getAttribute('src')).toBe('/images/achievements/gemastik.png');

    const featuredRow = screen.getByText('IOAI Silver Winner').closest('tr');
    const regularRow = screen.getByText('GEMASTIK Gold').closest('tr');
    expect(featuredRow).toHaveAttribute('data-featured', 'true');
    expect(regularRow).toHaveAttribute('data-featured', 'false');
  });

  it('shows image upload and detail fields for regular achievements, validates featured fields, and submits create/edit', async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(achievementsApi, 'create').mockResolvedValue({
      data: {
        id: 'compfest-2031',
        title: 'COMPFEST Champion',
        year: 2031,
        isFeatured: false,
        award: 'JUARA 2',
        image: { url: 'https://zenith.csui.dev/storage/zenith/achievements/test.webp' },
        teamName: 'Team Alpha',
        members: ["Dina IK'26"],
        description: 'Regular entry with image.',
        showOverlay: true,
        position: 0,
      },
    });

    render(<AchievementsPage />);
    await screen.findByText('GEMASTIK Gold');

    await user.click(screen.getByRole('button', { name: /add achievement/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Image & team fields are visible even when Featured is unchecked
    expect(screen.getByText('Achievement image (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Team name (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Team members (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('ID is required')).toBeInTheDocument();
    expect(screen.getByText('Title is required')).toBeInTheDocument();

    // Toggling Featured enforces required fields
    await user.click(screen.getByLabelText('Featured Showcase item'));
    expect(screen.getByText('Achievement image')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Award is required for featured achievements')).toBeInTheDocument();
    expect(screen.getByText('Image URL is required for featured achievements')).toBeInTheDocument();
    expect(screen.getByText('Team name is required for featured achievements')).toBeInTheDocument();
    expect(screen.getByText('At least one team member is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required for featured achievements')).toBeInTheDocument();

    // Uncheck Featured and submit a regular achievement with team details
    await user.click(screen.getByLabelText('Featured Showcase item'));
    fireEvent.change(screen.getByLabelText('ID'), { target: { value: 'compfest-2031' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2031' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'COMPFEST Champion' } });
    fireEvent.change(screen.getByLabelText('Team name (optional)'), {
      target: { value: 'Team Alpha' },
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'compfest-2031',
          year: 2031,
          title: 'COMPFEST Champion',
          isFeatured: false,
          teamName: 'Team Alpha',
        }),
      );
    });

    // Clicking Edit opens dialog directly with disabled ID
    await user.click(screen.getByRole('button', { name: 'Edit GEMASTIK Gold' }));
    expect(await screen.findByRole('heading', { name: 'Edit achievement' })).toBeInTheDocument();
    expect(screen.getByLabelText('ID')).toBeDisabled();
  });

  it('optimistically removes deleted achievement from the table', async () => {
    const user = userEvent.setup();
    let currentItems = [...ACHIEVEMENTS_FIXTURE];
    vi.spyOn(apiModule, 'api').mockImplementation(async () => ({
      data: currentItems,
      total: currentItems.length,
      page: 1,
      limit: 12,
      totalPages: 1,
    }));
    const removeSpy = vi.spyOn(achievementsApi, 'remove').mockImplementation(async (id) => {
      currentItems = currentItems.filter((item) => item.id !== id);
    });

    render(<AchievementsPage />);
    expect(await screen.findByText('COMPFEST Finalist')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete COMPFEST Finalist' }));
    await user.click(screen.getByRole('button', { name: 'Delete achievement' }));

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith('compfest-2029');
    });
    await waitFor(() => {
      expect(screen.queryByText('COMPFEST Finalist')).not.toBeInTheDocument();
    });
  });

  it('passes anti-slop copy and button accessibility checks', async () => {
    render(<AchievementsPage />);
    await screen.findByText('GEMASTIK Gold');

    expect(document.body.textContent).not.toContain('—');
    expect(document.body.textContent).not.toContain('–');

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      const accessibleText =
        button.getAttribute('aria-label')?.trim() || button.textContent?.trim() || '';
      expect(accessibleText.length).toBeGreaterThan(0);
    }
  });
});
