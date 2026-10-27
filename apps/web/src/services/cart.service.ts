import type { CartDto, CartLineInput } from '@shop/shared';
import { api } from '@/lib/api-client';

const unwrap = (r: { data: CartDto }) => r.data;

export const cartService = {
  get: (signal?: AbortSignal) => api.get<{ data: CartDto }>('/cart', { signal }).then(unwrap),
  addItem: (input: CartLineInput) => api.post<{ data: CartDto }>('/cart/items', input).then(unwrap),
  updateItem: (itemId: string, quantity: number) =>
    api.patch<{ data: CartDto }>(`/cart/items/${itemId}`, { quantity }).then(unwrap),
  removeItem: (itemId: string) => api.delete<{ data: CartDto }>(`/cart/items/${itemId}`).then(unwrap),
  clear: () => api.delete<{ data: CartDto }>('/cart').then(unwrap),
  validate: (items: CartLineInput[], signal?: AbortSignal) =>
    api.post<{ data: CartDto }>('/cart/validate', { items }, { signal, anonymous: true }).then(unwrap),
  merge: (items: CartLineInput[]) => api.post<{ data: CartDto }>('/cart/merge', { items }).then(unwrap),
};
