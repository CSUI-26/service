import { api } from '@/lib/api';
import type {
  ContentRequestCreate,
  ContentRequestDetail,
  ContentRequestMessage,
  ContentRequestMessageCreate,
  ContentRequestMessageUpdate,
  ContentRequestSummary,
  ContentRequestType,
  ContentRequestUpdate,
  RequestStatus,
} from '@zenith/shared';

export interface ContentRequestListParams {
  contentType?: ContentRequestType;
  status?: RequestStatus;
  search?: string;
  scope?: 'mine' | 'all';
  page?: number;
  limit?: number;
}

export interface PaginatedContentRequestsResponse {
  data: ContentRequestSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const contentRequestsApi = {
  list: (params: ContentRequestListParams = {}) => {
    const query = new URLSearchParams();
    if (params.contentType) query.set('contentType', params.contentType);
    if (params.status) query.set('status', params.status);
    if (params.search?.trim()) query.set('search', params.search.trim());
    if (params.scope) query.set('scope', params.scope);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api<PaginatedContentRequestsResponse>(`/content-requests${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) => api<{ data: ContentRequestDetail }>(`/content-requests/${id}`),
  create: (payload: ContentRequestCreate) =>
    api<{ data: ContentRequestDetail }>('/content-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: ContentRequestUpdate) =>
    api<{ data: ContentRequestDetail }>(`/content-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    api<{ data: { id: number } }>(`/content-requests/${id}`, { method: 'DELETE' }),
  createMessage: (requestId: number, payload: ContentRequestMessageCreate) =>
    api<{ data: ContentRequestMessage }>(`/content-requests/${requestId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMessage: (requestId: number, messageId: number, payload: ContentRequestMessageUpdate) =>
    api<{ data: ContentRequestMessage }>(
      `/content-requests/${requestId}/messages/${messageId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    ),
  removeMessage: (requestId: number, messageId: number) =>
    api<{ data: { id: number } }>(`/content-requests/${requestId}/messages/${messageId}`, {
      method: 'DELETE',
    }),
};

export const MEMBER_CONTENT_TYPE_LABELS: Record<ContentRequestType, string> = {
  achievement: 'Achievement',
  gallery: 'Galeri',
  activity: 'Kegiatan',
  other: 'Konten Lainnya',
};

export const ADMIN_CONTENT_TYPE_LABELS: Record<ContentRequestType, string> = {
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

export function formatEpochTimestamp(
  epochSec: number,
  locale: 'id-ID' | 'en-US' = 'id-ID',
): string {
  if (!epochSec) return '';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(epochSec * 1000));
}
