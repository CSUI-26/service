import { api } from '@/lib/api';
import type {
  GalleryCategory,
  GalleryItem,
  GalleryItemCreate,
  GalleryItemUpdate,
  PublicGalleryResponse,
} from '@zenith/shared';

export interface GalleryListParams {
  search?: string;
  category?: GalleryCategory;
  featured?: boolean;
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

export const galleryApi = {
  list: (params: GalleryListParams = {}) => {
    const query = new URLSearchParams();
    if (params.search?.trim()) query.set('search', params.search.trim());
    if (params.category) query.set('category', params.category);
    if (params.featured !== undefined) query.set('featured', String(params.featured));
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api<PaginatedResponse<GalleryItem>>(`/gallery${qs ? `?${qs}` : ''}`);
  },
  listGrouped: () => api<{ data: PublicGalleryResponse }>('/gallery?format=grouped'),
  get: (id: string) => api<{ data: GalleryItem }>(`/gallery/${encodeURIComponent(id)}`),
  create: (payload: GalleryItemCreate) =>
    api<{ data: GalleryItem }>('/gallery', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: GalleryItemUpdate) =>
    api<{ data: GalleryItem }>(`/gallery/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    api<void>(`/gallery/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
