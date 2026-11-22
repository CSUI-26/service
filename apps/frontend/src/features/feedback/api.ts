import { api } from '@/lib/api';
import type {
  FeedbackCategory,
  FeedbackMessage,
  FeedbackMessageCreate,
  FeedbackMessageUpdate,
  FeedbackThreadCreate,
  FeedbackThreadDetail,
  FeedbackThreadSummary,
  FeedbackThreadUpdate,
  RequestStatus,
} from '@zenith/shared';

export interface FeedbackListParams {
  category?: FeedbackCategory;
  status?: RequestStatus;
  search?: string;
  scope?: 'mine' | 'all';
  page?: number;
  limit?: number;
}

export interface PaginatedFeedbackResponse {
  data: FeedbackThreadSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const feedbackApi = {
  list: (params: FeedbackListParams = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.status) query.set('status', params.status);
    if (params.search?.trim()) query.set('search', params.search.trim());
    if (params.scope) query.set('scope', params.scope);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api<PaginatedFeedbackResponse>(`/feedback${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) => api<{ data: FeedbackThreadDetail }>(`/feedback/${id}`),
  create: (payload: FeedbackThreadCreate) =>
    api<{ data: FeedbackThreadDetail }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: FeedbackThreadUpdate) =>
    api<{ data: FeedbackThreadDetail }>(`/feedback/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    api<{ data: { id: number } }>(`/feedback/${id}`, { method: 'DELETE' }),
  createMessage: (threadId: number, payload: FeedbackMessageCreate) =>
    api<{ data: FeedbackMessage }>(`/feedback/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMessage: (threadId: number, messageId: number, payload: FeedbackMessageUpdate) =>
    api<{ data: FeedbackMessage }>(`/feedback/${threadId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  removeMessage: (threadId: number, messageId: number) =>
    api<{ data: { id: number } }>(`/feedback/${threadId}/messages/${messageId}`, {
      method: 'DELETE',
    }),
};

export const MEMBER_FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  feedback: 'Feedback',
  help: 'Bantuan',
  other: 'Lainnya',
};

export const ADMIN_FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  feedback: 'Feedback',
  help: 'Help',
  other: 'Other',
};
