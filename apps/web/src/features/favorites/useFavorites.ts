import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductListItemDto } from '@shop/shared';
import { favoriteService } from '@/services/favorite.service';
import { productService } from '@/services/product.service';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore, selectIsAuthenticated } from '@/store/auth.store';
import { useGuestFavoritesStore } from '@/store/guest-favorites.store';
import { toast } from '@/store/ui.store';
import { getErrorMessage } from '@/lib/api-client';

/** Misafir: localStorage id listesi; kullanıcı: sunucu favorileri. */
export function useFavorites() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const guestIds = useGuestFavoritesStore((s) => s.productIds);
  const toggleGuest = useGuestFavoritesStore((s) => s.toggle);
  const qc = useQueryClient();

  const serverQuery = useQuery({
    queryKey: queryKeys.favorites,
    queryFn: ({ signal }) => favoriteService.list(signal),
    enabled: isAuthenticated,
  });

  const guestQuery = useQuery({
    queryKey: ['favorites', 'guest', guestIds.join(',')],
    queryFn: () => productService.byIds(guestIds),
    enabled: !isAuthenticated && guestIds.length > 0,
  });

  const products: ProductListItemDto[] = isAuthenticated ? (serverQuery.data ?? []) : guestIds.length ? (guestQuery.data ?? []) : [];
  const ids = useMemo(() => (isAuthenticated ? new Set(products.map((p) => p.id)) : new Set(guestIds)), [isAuthenticated, products, guestIds]);

  const mutation = useMutation({
    mutationFn: async ({ productId, add }: { productId: string; add: boolean }) => {
      if (add) await favoriteService.add(productId);
      else await favoriteService.remove(productId);
    },
    onMutate: async ({ productId, add }) => {
      await qc.cancelQueries({ queryKey: queryKeys.favorites });
      const prev = qc.getQueryData<ProductListItemDto[]>(queryKeys.favorites);
      if (!add && prev) qc.setQueryData(queryKeys.favorites, prev.filter((p) => p.id !== productId));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.favorites, ctx.prev);
      toast.error('İşlem başarısız', getErrorMessage(e));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: queryKeys.favorites }),
  });

  const toggle = useCallback(
    (productId: string) => {
      const willAdd = !ids.has(productId);
      if (isAuthenticated) mutation.mutate({ productId, add: willAdd });
      else toggleGuest(productId);
      toast.success(willAdd ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı');
      return willAdd;
    },
    [ids, isAuthenticated, mutation, toggleGuest],
  );

  return {
    products,
    ids,
    isFavorite: (productId: string) => ids.has(productId),
    toggle,
    count: isAuthenticated ? products.length : guestIds.length,
    isLoading: isAuthenticated ? serverQuery.isLoading : guestIds.length > 0 && guestQuery.isLoading,
    error: isAuthenticated ? serverQuery.error : guestQuery.error,
    refetch: () => (isAuthenticated ? serverQuery.refetch() : guestQuery.refetch()),
  };
}

export function useFavoriteCount() {
  return useFavorites().count;
}
