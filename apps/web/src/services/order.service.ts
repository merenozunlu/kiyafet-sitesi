import type { CreateOrderInput, OrderDto, PaginationMeta } from '@shop/shared';
import { api } from '@/lib/api-client';

export const orderService = {
  /**
   * Sipariş oluşturur. Idempotency-Key aynı sipariş denemesinin iki kez
   * işlenmesini engeller. Kart verisi yalnızca bu istekte gönderilir; asla saklanmaz.
   */
  create: (input: CreateOrderInput, idempotencyKey: string) =>
    api.post<{ data: OrderDto }>('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey }, timeoutMs: 30_000 }).then((r) => r.data),
  list: (page: number, signal?: AbortSignal) => api.get<{ data: OrderDto[]; meta: PaginationMeta }>('/orders', { query: { page, pageSize: 10 }, signal }),
  byId: (id: string, signal?: AbortSignal) => api.get<{ data: OrderDto }>(`/orders/${id}`, { signal }).then((r) => r.data),
  track: (orderNumber: string, email: string, signal?: AbortSignal) =>
    api.get<{ data: OrderDto }>(`/orders/track/${encodeURIComponent(orderNumber)}`, { query: { email }, signal, anonymous: true }).then((r) => r.data),
  cancel: (id: string, reason?: string) => api.post<{ data: OrderDto }>(`/orders/${id}/cancel`, { reason }).then((r) => r.data),
};
