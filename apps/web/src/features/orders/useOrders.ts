import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/order.service';
import { queryKeys } from '@/lib/query-client';
import { getErrorMessage } from '@/lib/api-client';
import { toast } from '@/store/ui.store';

export function useOrders(page: number) {
  return useQuery({ queryKey: queryKeys.orders(page), queryFn: ({ signal }) => orderService.list(page, signal), placeholderData: (prev) => prev });
}

export function useOrder(id: string) {
  return useQuery({ queryKey: queryKeys.order(id), queryFn: ({ signal }) => orderService.byId(id, signal), enabled: !!id });
}

export function useCancelOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => orderService.cancel(id, reason),
    onSuccess: (order) => {
      qc.setQueryData(queryKeys.order(id), order);
      void qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Siparişiniz iptal edildi', 'Stok iade edildi; ödeme yaptıysanız iade süreci başlatıldı.');
    },
    onError: (e) => toast.error('İptal edilemedi', getErrorMessage(e)),
  });
}
