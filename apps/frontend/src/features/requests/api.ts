import { api } from '@/lib/api';
import type {
  RequestCategory,
  RequestContentType,
  RequestMessage,
  RequestMessageCreate,
  RequestMessageUpdate,
  RequestStatus,
  RequestThreadCreate,
  RequestThreadDetail,
  RequestThreadSummary,
  RequestThreadUpdate,
} from '@zenith/shared';

export interface RequestListParams {
  category?: RequestCategory;
  status?: RequestStatus;
  search?: string;
  scope?: 'mine' | 'all';
  page?: number;
  limit?: number;
}

export interface PaginatedRequestsResponse {
  data: RequestThreadSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const requestsApi = {
  list: (params: RequestListParams = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.status) query.set('status', params.status);
    if (params.search?.trim()) query.set('search', params.search.trim());
    if (params.scope) query.set('scope', params.scope);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api<PaginatedRequestsResponse>(`/requests${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) => api<{ data: RequestThreadDetail }>(`/requests/${id}`),
  create: (payload: RequestThreadCreate) =>
    api<{ data: RequestThreadDetail }>('/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: RequestThreadUpdate) =>
    api<{ data: RequestThreadDetail }>(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    api<{ data: { id: number } }>(`/requests/${id}`, { method: 'DELETE' }),
  createMessage: (threadId: number, payload: RequestMessageCreate) =>
    api<{ data: RequestMessage }>(`/requests/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMessage: (threadId: number, messageId: number, payload: RequestMessageUpdate) =>
    api<{ data: RequestMessage }>(`/requests/${threadId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  removeMessage: (threadId: number, messageId: number) =>
    api<{ data: { id: number } }>(`/requests/${threadId}/messages/${messageId}`, {
      method: 'DELETE',
    }),
};

export const MEMBER_CATEGORY_LABELS: Record<RequestCategory, string> = {
  content: 'Request Konten',
  feedback: 'Feedback',
  help: 'Bantuan',
  other: 'Lainnya',
};

export const ADMIN_CATEGORY_LABELS: Record<RequestCategory, string> = {
  content: 'Request for Content',
  feedback: 'Feedback',
  help: 'Help',
  other: 'Other',
};

export const MEMBER_CONTENT_TYPE_LABELS: Record<RequestContentType, string> = {
  achievement: 'Achievement',
  gallery: 'Galeri',
  activity: 'Kegiatan',
  other: 'Konten Lainnya',
};

export const ADMIN_CONTENT_TYPE_LABELS: Record<RequestContentType, string> = {
  achievement: 'Achievement',
  gallery: 'Gallery',
  activity: 'Activity',
  other: 'Other Content',
};

export const MEMBER_STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Terbuka',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  closed: 'Ditutup',
};

export const ADMIN_STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function statusBadgeVariant(
  status: RequestStatus,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'open':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'resolved':
      return 'outline';
    case 'closed':
      return 'outline';
  }
}

export function formatEpochTimestamp(epochSec: number, locale: 'id-ID' | 'en-US' = 'id-ID'): string {
  if (!epochSec) return '';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(epochSec * 1000));
}
