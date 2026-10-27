import type { ProductListItemDto } from '@shop/shared';
import { api } from '@/lib/api-client';

export const favoriteService = {
  list: (signal?: AbortSignal) => api.get<{ data: ProductListItemDto[] }>('/favorites', { signal }).then((r) => r.data),
  add: (productId: string) => api.post<{ data: { productId: string } }>(`/favorites/${productId}`),
  remove: (productId: string) => api.delete<void>(`/favorites/${productId}`),
  merge: (productIds: string[]) => api.post<{ data: ProductListItemDto[] }>('/favorites/merge', { productIds }).then((r) => r.data),
};
