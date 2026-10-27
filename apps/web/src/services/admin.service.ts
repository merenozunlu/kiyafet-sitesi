import type {
  AdminCustomerDto,
  AdminDashboardDto,
  AuditLogDto,
  CategoryDto,
  CategoryInput,
  OrderDto,
  PaginationMeta,
  ProductDetailDto,
  ProductInput,
  ProductUpdateInput,
  UpdateOrderStatusInput,
} from '@shop/shared';
import { api } from '@/lib/api-client';

type Query = Record<string, string | number | boolean | undefined | null>;
type Paged<T> = { data: T[]; meta: PaginationMeta };

export const adminService = {
  dashboard: (signal?: AbortSignal) => api.get<{ data: AdminDashboardDto }>('/admin/dashboard', { signal }).then((r) => r.data),

  products: {
    list: (query: Query, signal?: AbortSignal) => api.get<Paged<ProductDetailDto>>('/admin/products', { query, signal }),
    byId: (id: string, signal?: AbortSignal) => api.get<{ data: ProductDetailDto }>(`/admin/products/${id}`, { signal }).then((r) => r.data),
    create: (input: ProductInput) => api.post<{ data: ProductDetailDto }>('/admin/products', input).then((r) => r.data),
    update: (id: string, input: ProductUpdateInput) => api.patch<{ data: ProductDetailDto }>(`/admin/products/${id}`, input).then((r) => r.data),
    archive: (id: string) => api.delete<void>(`/admin/products/${id}`),
  },

  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<{ data: { url: string; filename: string; size: number } }>('/admin/uploads', undefined, { formData: fd, timeoutMs: 60_000 }).then((r) => r.data);
  },

  categories: {
    list: (signal?: AbortSignal) => api.get<{ data: CategoryDto[] }>('/admin/categories', { signal }).then((r) => r.data),
    create: (input: CategoryInput) => api.post<{ data: CategoryDto }>('/admin/categories', input).then((r) => r.data),
    update: (id: string, input: Partial<CategoryInput>) => api.patch<{ data: CategoryDto }>(`/admin/categories/${id}`, input).then((r) => r.data),
    remove: (id: string) => api.delete<void>(`/admin/categories/${id}`),
  },

  orders: {
    list: (query: Query, signal?: AbortSignal) => api.get<Paged<OrderDto>>('/admin/orders', { query, signal }),
    byId: (id: string, signal?: AbortSignal) => api.get<{ data: OrderDto }>(`/admin/orders/${id}`, { signal }).then((r) => r.data),
    updateStatus: (id: string, input: UpdateOrderStatusInput) => api.patch<{ data: OrderDto }>(`/admin/orders/${id}/status`, input).then((r) => r.data),
    updatePaymentStatus: (id: string, input: { paymentStatus: 'PAID' | 'FAILED' | 'REFUNDED'; note?: string }) =>
      api.patch<{ data: OrderDto }>(`/admin/orders/${id}/payment-status`, input).then((r) => r.data),
  },

  customers: {
    list: (query: Query, signal?: AbortSignal) => api.get<Paged<AdminCustomerDto>>('/admin/customers', { query, signal }),
  },

  auditLogs: {
    list: (page: number, signal?: AbortSignal) => api.get<Paged<AuditLogDto>>('/admin/audit-logs', { query: { page, pageSize: 30 }, signal }),
  },
};
