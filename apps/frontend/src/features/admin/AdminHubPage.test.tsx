import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminHubPage from '@/features/admin/AdminHubPage';
import { adminStatsApi } from '@/features/admin/api';

describe('AdminHubPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all 7 module cards with live SQL stat badges and links', async () => {
    vi.spyOn(adminStatsApi, 'get').mockResolvedValue({
      data: {
        programs: 4,
        courses: 42,
        members: 120,
        achievements: 18,
        galleryItems: 25,
        activities: 7,
        openContentRequests: 3,
        openFeedbackThreads: 2,
      },
    });

    render(
      <MemoryRouter>
        <AdminHubPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Study Programs')).toBeInTheDocument();
    expect(screen.getByText('4 programs')).toBeInTheDocument();
    expect(screen.getByText('42 courses')).toBeInTheDocument();
    expect(screen.getByText('120 members')).toBeInTheDocument();
    expect(screen.getByText('18 awards')).toBeInTheDocument();
    expect(screen.getByText('25 items')).toBeInTheDocument();
    expect(screen.getByText('7 activities')).toBeInTheDocument();
    expect(screen.getByText('3 open content, 2 open feedback')).toBeInTheDocument();

    const expectedRoutes = [
      '/programs',
      '/courses',
      '/members',
      '/achievements',
      '/gallery',
      '/activities',
      '/admin/requests',
    ];
    const links = screen.getAllByRole('link');
    expect(links.map((el) => el.getAttribute('href'))).toEqual(expectedRoutes);

    expect(document.body.textContent).not.toContain('—');
    expect(document.body.textContent).not.toContain('–');
  });

  it('renders ListState error and recovers on retry', async () => {
    const user = userEvent.setup();
    const spy = vi
      .spyOn(adminStatsApi, 'get')
      .mockRejectedValueOnce(new Error('Stats service unavailable'))
      .mockResolvedValueOnce({
        data: {
          programs: 2,
          courses: 10,
          members: 50,
          achievements: 5,
          galleryItems: 8,
          activities: 3,
          openContentRequests: 1,
          openFeedbackThreads: 0,
        },
      });

    render(
      <MemoryRouter>
        <AdminHubPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Stats service unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('2 programs')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
