import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordSchema, type ResetPasswordInput } from '@shop/shared';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/Input';
import { usePageTitle } from '@/hooks/usePageTitle';
import { applyServerErrors } from '@/lib/forms';
import { authService } from '@/services/auth.service';
import { toast } from '@/store/ui.store';

export default function ResetPasswordPage() {
  usePageTitle('Şifre Yenile');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token, password: '', passwordConfirm: '' } });
  const mutation = useMutation({ mutationFn: authService.resetPassword });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const r = await mutation.mutateAsync(values);
      toast.success('Şifreniz güncellendi', r.message);
      navigate('/giris', { replace: true });
    } catch (e) {
      applyServerErrors(e, form.setError, ['password', 'passwordConfirm', 'token']);
    }
  });

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold">Bağlantı geçersiz</h1>
        <p className="mt-2 text-sm text-secondary">Şifre sıfırlama bağlantısı eksik veya hatalı. Lütfen yeni bir bağlantı isteyin.</p>
        <Link to="/sifremi-unuttum" className="mt-6 inline-block">
          <Button>Yeni bağlantı iste</Button>
        </Link>
      </div>
    );
  }

  const { errors } = form.formState;
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">Yeni Şifre Belirle</h1>
      <p className="mt-2 text-sm text-secondary">Hesabınız için yeni bir şifre oluşturun.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <input type="hidden" {...form.register('token')} />
        <PasswordInput label="Yeni şifre" autoComplete="new-password" hint="En az 8 karakter, bir harf ve bir rakam" {...form.register('password')} error={errors.password?.message} />
        <PasswordInput label="Yeni şifre (tekrar)" autoComplete="new-password" {...form.register('passwordConfirm')} error={errors.passwordConfirm?.message} />
        {(errors.root || errors.token) && (
          <p className="error-text" role="alert">
            {errors.root?.message ?? errors.token?.message}
          </p>
        )}
        <Button type="submit" fullWidth size="lg" loading={mutation.isPending}>
          Şifreyi Güncelle
        </Button>
      </form>
    </div>
  );
}
