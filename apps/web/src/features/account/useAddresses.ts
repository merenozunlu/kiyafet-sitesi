import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddressDto, AddressInput } from '@shop/shared';
import { addressService } from '@/services/address.service';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore, selectIsAuthenticated } from '@/store/auth.store';
import { getErrorMessage } from '@/lib/api-client';
import { toast } from '@/store/ui.store';

export function useAddresses() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.addresses, queryFn: ({ signal }) => addressService.list(signal), enabled: isAuthenticated });
  const set = (list: AddressDto[]) => qc.setQueryData(queryKeys.addresses, list);
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.addresses });

  const create = useMutation({
    mutationFn: (input: AddressInput) => addressService.create(input),
    onSuccess: () => {
      void invalidate();
      toast.success('Adres eklendi');
    },
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AddressInput> }) => addressService.update(id, input),
    onSuccess: () => {
      void invalidate();
      toast.success('Adres güncellendi');
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => addressService.remove(id),
    onSuccess: (_d, id) => {
      set((query.data ?? []).filter((a) => a.id !== id));
      void invalidate();
      toast.success('Adres silindi');
    },
    onError: (e) => toast.error('Adres silinemedi', getErrorMessage(e)),
  });
  const setDefault = useMutation({
    mutationFn: (id: string) => addressService.setDefault(id),
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error('İşlem başarısız', getErrorMessage(e)),
  });

  return {
    addresses: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
    setDefault,
  };
}
