import type { AddressDto, AddressInput } from '@shop/shared';
import { api } from '@/lib/api-client';

export const addressService = {
  list: (signal?: AbortSignal) => api.get<{ data: AddressDto[] }>('/addresses', { signal }).then((r) => r.data),
  create: (input: AddressInput) => api.post<{ data: AddressDto }>('/addresses', input).then((r) => r.data),
  update: (id: string, input: Partial<AddressInput>) => api.patch<{ data: AddressDto }>(`/addresses/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete<void>(`/addresses/${id}`),
  setDefault: (id: string) => api.post<{ data: AddressDto }>(`/addresses/${id}/default`).then((r) => r.data),
};
