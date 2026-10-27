import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@shop/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePageTitle } from '@/hooks/usePageTitle';
import { applyServerErrors } from '@/lib/forms';
import { authService } from '@/services/auth.service';

export default function ForgotPasswordPage() {
  usePageTitle('Şifremi Unuttum');
  const [result, setResult] = useState<{ message: string; debugResetUrl?: string } | null>(null);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });
  const mutation = useMutation({ mutationFn: authService.forgotPassword });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setResult(await mutation.mutateAsync(values));
    } catch (e) {
      applyServerErrors(e, form.setError, ['email']);
    }
  });

  if (result) {
    const resetPath = result.debugResetUrl ? new URL(result.debugResetUrl).pathname + new URL(result.debugResetUrl).search : null;
    return (
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted">
          <MailCheck className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold">E-postanızı kontrol edin</h1>
        <p className="mt-2 text-sm text-secondary">{result.message}</p>
        {resetPath && (
          <div className="mt-6 rounded-md border border-dashed border-border bg-surface-muted p-4 text-left text-xs text-secondary">
            <p className="font-medium text-primary">Geliştirme modu</p>
            <p className="mt-1">E-posta gönderimi henüz bağlı değil. Sıfırlama bağlantısı:</p>
            <Link to={resetPath} className="mt-2 block break-all font-mono text-primary underline underline-offset-4">
              {resetPath}
            </Link>
          </div>
        )}
        <Link to="/giris" className="mt-8 inline-block text-sm underline underline-offset-4">
          Girişe dön
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">Şifremi Unuttum</h1>
      <p className="mt-2 text-sm text-secondary">E-posta adresinizi girin; kayıtlıysa size bir sıfırlama bağlantısı gönderelim.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Input label="E-posta" type="email" autoComplete="email" {...form.register('email')} error={form.formState.errors.email?.message} />
        {form.formState.errors.root && (
          <p className="error-text" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" fullWidth size="lg" loading={mutation.isPending}>
          Bağlantı Gönder
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-secondary">
        <Link to="/giris" className="underline-offset-4 hover:underline">
          Girişe dön
        </Link>
      </p>
    </div>
  );
}
