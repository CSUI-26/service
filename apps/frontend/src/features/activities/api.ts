import { api } from '@/lib/api';
import type { Activity, ActivityCreate, ActivityUpdate } from '@zenith/shared';

export interface ActivityListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const activitiesApi = {
  list: (params: ActivityListParams = {}) => {
    const query = new URLSearchParams();
    if (params.search?.trim()) query.set('search', params.search.trim());
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api<PaginatedResponse<Activity>>(`/activities${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api<{ data: Activity }>(`/activities/${encodeURIComponent(id)}`),
  create: (payload: ActivityCreate) =>
    api<{ data: Activity }>('/activities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: ActivityUpdate) =>
    api<{ data: Activity }>(`/activities/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    api<void>(`/activities/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
