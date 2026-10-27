import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { newsletterSchema } from '@shop/shared';
import type { z } from 'zod';
import { api, getErrorMessage } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/store/ui.store';

type FormValues = z.infer<typeof newsletterSchema>;

export function NewsletterForm({ compact }: { compact?: boolean }) {
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({ resolver: zodResolver(newsletterSchema) });
  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.post<{ data: { message: string } }>('/newsletter', values, { anonymous: true }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      reset();
    },
    onError: (e) => toast.error('Kayıt yapılamadı', getErrorMessage(e)),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className={compact ? 'flex w-full max-w-md gap-2' : 'flex w-full max-w-md flex-col gap-2 sm:flex-row'} noValidate>
      <Input
        type="email"
        placeholder="E-posta adresiniz"
        autoComplete="email"
        label="Bültene abone ol"
        hideLabel
        containerClassName="flex-1"
        error={formState.errors.email?.message}
        {...register('email')}
      />
      <Button type="submit" loading={mutation.isPending} className="shrink-0">
        Abone Ol
      </Button>
    </form>
  );
}
