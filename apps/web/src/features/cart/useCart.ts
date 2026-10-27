import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CartDto, CartItemDto } from '@shop/shared';
import { cartService } from '@/services/cart.service';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore, selectIsAuthenticated } from '@/store/auth.store';
import { guestCartSignature, useGuestCartStore } from '@/store/guest-cart.store';
import { getErrorMessage, isApiError } from '@/lib/api-client';
import { toast } from '@/store/ui.store';

const EMPTY_CART: CartDto = {
  items: [],
  summary: { subtotalCents: 0, discountCents: 0, shippingCents: 0, totalCents: 0, freeShippingThresholdCents: 0, itemCount: 0 },
  warnings: [],
};

/**
 * Tek merkezi sepet hook'u. Misafir ve giriş yapmış kullanıcı modlarını birleştirir.
 * - Giriş yapmış: sunucu sepeti (TanStack Query cache).
 * - Misafir: localStorage'daki satırlar + sunucu doğrulaması (/cart/validate).
 */
export function useCart() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const authStatus = useAuthStore((s) => s.status);
  const guestLines = useGuestCartStore((s) => s.lines);
  const guest = useGuestCartStore();
  const qc = useQueryClient();

  const guestSig = guestCartSignature(guestLines);

  const serverQuery = useQuery({
    queryKey: queryKeys.cart,
    queryFn: ({ signal }) => cartService.get(signal),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const guestQuery = useQuery({
    queryKey: queryKeys.guestCart(guestSig),
    queryFn: ({ signal }) => cartService.validate(guestLines, signal),
    enabled: !isAuthenticated && authStatus !== 'loading' && authStatus !== 'idle' && guestLines.length > 0,
    staleTime: 30_000,
  });

  const cart: CartDto = isAuthenticated ? (serverQuery.data ?? EMPTY_CART) : guestLines.length === 0 ? EMPTY_CART : (guestQuery.data ?? EMPTY_CART);

  const isLoading = isAuthenticated ? serverQuery.isLoading : guestLines.length > 0 && guestQuery.isLoading;
  const isFetching = isAuthenticated ? serverQuery.isFetching : guestQuery.isFetching;
  const error = isAuthenticated ? serverQuery.error : guestQuery.error;

  const setServerCart = useCallback((data: CartDto) => qc.setQueryData(queryKeys.cart, data), [qc]);

  const addMutation = useMutation({
    mutationFn: async (input: { variantId: string; quantity: number; maxStock?: number }) => {
      if (isAuthenticated) return cartService.addItem({ variantId: input.variantId, quantity: input.quantity });
      // Misafir: önce sunucuda doğrula (stok/varyant), sonra yerel sepete yaz
      const existing = guestLines.find((l) => l.variantId === input.variantId);
      const nextQty = (existing?.quantity ?? 0) + input.quantity;
      const validated = await cartService.validate([
        ...guestLines.filter((l) => l.variantId !== input.variantId),
        { variantId: input.variantId, quantity: nextQty },
      ]);
      const line = validated.items.find((i) => i.variantId === input.variantId);
      if (!line || line.warning === 'OUT_OF_STOCK' || line.warning === 'INACTIVE') {
        throw new Error('Bu ürün şu anda stokta yok.');
      }
      guest.setQuantity(input.variantId, line.quantity);
      return validated;
    },
    onSuccess: (data, vars) => {
      if (isAuthenticated) setServerCart(data);
      const line = data.items.find((i) => i.variantId === vars.variantId);
      if (line?.warning === 'QUANTITY_REDUCED') {
        toast.warning('Stok sınırı', `Bu ürün için en fazla ${line.stockQuantity} adet ekleyebilirsiniz.`);
      }
    },
    onError: (e) => {
      toast.error('Sepete eklenemedi', getErrorMessage(e));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ item, quantity }: { item: CartItemDto; quantity: number }) => {
      if (isAuthenticated) return cartService.updateItem(item.id, quantity);
      guest.setQuantity(item.variantId, quantity);
      return null;
    },
    onSuccess: (data) => {
      if (data) setServerCart(data);
    },
    onError: (e) => {
      toast.error('Adet güncellenemedi', getErrorMessage(e));
      if (isAuthenticated) void qc.invalidateQueries({ queryKey: queryKeys.cart });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (item: CartItemDto) => {
      if (isAuthenticated) return cartService.removeItem(item.id);
      guest.remove(item.variantId);
      return null;
    },
    onSuccess: (data) => {
      if (data) setServerCart(data);
    },
    onError: (e) => toast.error('Ürün kaldırılamadı', getErrorMessage(e)),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (isAuthenticated) return cartService.clear();
      guest.clear();
      return null;
    },
    onSuccess: (data) => {
      if (data) setServerCart(data);
    },
  });

  const itemCount = useMemo(
    () => (isAuthenticated ? cart.summary.itemCount : guestLines.reduce((n, l) => n + l.quantity, 0)),
    [isAuthenticated, cart.summary.itemCount, guestLines],
  );

  const refetch = useCallback(() => {
    if (isAuthenticated) return qc.invalidateQueries({ queryKey: queryKeys.cart });
    return qc.invalidateQueries({ queryKey: ['cart', 'guest'] });
  }, [isAuthenticated, qc]);

  return {
    cart,
    items: cart.items,
    summary: cart.summary,
    warnings: cart.warnings,
    itemCount,
    isLoading,
    isFetching,
    error,
    isGuest: !isAuthenticated,
    addItem: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    updateQuantity: (item: CartItemDto, quantity: number) => updateMutation.mutate({ item, quantity }),
    removeItem: (item: CartItemDto) => removeMutation.mutate(item),
    clear: clearMutation.mutateAsync,
    isMutating: updateMutation.isPending || removeMutation.isPending || clearMutation.isPending,
    refetch,
    hasBlockingWarnings: cart.items.some((i) => i.warning === 'OUT_OF_STOCK' || i.warning === 'INACTIVE'),
  };
}

/** Yalnızca rozet için hafif sayaç. */
export function useCartCount() {
  const { itemCount } = useCart();
  return itemCount;
}

export function isOutOfStockError(e: unknown) {
  return isApiError(e) && e.code === 'OUT_OF_STOCK';
}
