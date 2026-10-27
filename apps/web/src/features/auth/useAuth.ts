import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthResponseDto, LoginInput, RegisterInput } from '@shop/shared';
import { authService } from '@/services/auth.service';
import { cartService } from '@/services/cart.service';
import { favoriteService } from '@/services/favorite.service';
import { useAuthStore } from '@/store/auth.store';
import { useGuestCartStore } from '@/store/guest-cart.store';
import { useGuestFavoritesStore } from '@/store/guest-favorites.store';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/store/ui.store';

/**
 * Giriş sonrası misafir sepeti ve favorileri sunucu ile birleştirir.
 * Politika: aynı varyant -> adetler toplanır (stokla sınırlanır); farklı varyantlar ayrı satır.
 */
async function mergeGuestData(qc: ReturnType<typeof useQueryClient>) {
  const guestCart = useGuestCartStore.getState();
  const guestFav = useGuestFavoritesStore.getState();
  const tasks: Promise<unknown>[] = [];

  if (guestCart.lines.length > 0) {
    tasks.push(
      cartService
        .merge(guestCart.lines)
        .then((cart) => {
          qc.setQueryData(queryKeys.cart, cart);
          guestCart.clear();
          if (cart.warnings.length) toast.warning('Sepetiniz güncellendi', cart.warnings[0]);
        })
        .catch(() => toast.warning('Sepet birleştirilemedi', 'Misafir sepetiniz korunuyor; daha sonra tekrar deneyin.')),
    );
  }
  if (guestFav.productIds.length > 0) {
    tasks.push(
      favoriteService
        .merge(guestFav.productIds)
        .then((list) => {
          qc.setQueryData(queryKeys.favorites, list);
          guestFav.clear();
        })
        .catch(() => undefined),
    );
  }
  await Promise.all(tasks);
}

function useAfterAuth() {
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  return async (data: AuthResponseDto) => {
    setSession(data);
    await mergeGuestData(qc);
    void qc.invalidateQueries({ queryKey: queryKeys.cart });
    void qc.invalidateQueries({ queryKey: queryKeys.favorites });
  };
}

export function useLogin() {
  const after = useAfterAuth();
  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: after,
  });
}

export function useRegister() {
  const after = useAfterAuth();
  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: after,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);
  return useMutation({
    mutationFn: () => authService.logout().catch(() => undefined),
    onSuccess: () => {
      clearSession();
      qc.removeQueries({ queryKey: queryKeys.cart });
      qc.removeQueries({ queryKey: queryKeys.favorites });
      qc.removeQueries({ queryKey: queryKeys.addresses });
      qc.removeQueries({ queryKey: ['orders'] });
      qc.removeQueries({ queryKey: ['admin'] });
      toast.info('Çıkış yapıldı');
    },
  });
}
