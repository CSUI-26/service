import type { AdminStats } from '@zenith/shared';
import { api } from '@/lib/api';

export const adminStatsApi = {
  get: () => api<{ data: AdminStats }>('/admin/stats'),
};
