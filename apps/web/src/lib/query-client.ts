import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status > 0 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export const queryKeys = {
  home: ['home'] as const,
  categories: ['categories'] as const,
  category: (slug: string) => ['categories', slug] as const,
  products: (params: Record<string, unknown>) => ['products', params] as const,
  product: (slug: string) => ['product', slug] as const,
  related: (id: string) => ['product', id, 'related'] as const,
  search: (q: string) => ['search', q] as const,
  me: ['me'] as const,
  addresses: ['addresses'] as const,
  cart: ['cart'] as const,
  guestCart: (sig: string) => ['cart', 'guest', sig] as const,
  favorites: ['favorites'] as const,
  orders: (page: number) => ['orders', page] as const,
  order: (id: string) => ['orders', 'detail', id] as const,
  admin: {
    dashboard: ['admin', 'dashboard'] as const,
    products: (params: Record<string, unknown>) => ['admin', 'products', params] as const,
    product: (id: string) => ['admin', 'products', 'detail', id] as const,
    categories: ['admin', 'categories'] as const,
    orders: (params: Record<string, unknown>) => ['admin', 'orders', params] as const,
    order: (id: string) => ['admin', 'orders', 'detail', id] as const,
    customers: (params: Record<string, unknown>) => ['admin', 'customers', params] as const,
    auditLogs: (page: number) => ['admin', 'audit', page] as const,
  },
};
