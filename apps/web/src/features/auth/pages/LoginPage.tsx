import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@shop/shared';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { usePageTitle } from '@/hooks/usePageTitle';
import { applyServerErrors } from '@/lib/forms';
import { toast } from '@/store/ui.store';
import { useLogin } from '../useAuth';

export default function LoginPage({ admin = false }: { admin?: boolean }) {
  usePageTitle(admin ? 'Yönetici Girişi' : 'Giriş Yap');
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const login = useLogin();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const data = await login.mutateAsync(values);
      if (admin && data.user.role !== 'ADMIN') {
        form.setError('root', { message: 'Bu hesap yönetici yetkisine sahip değil.' });
        return;
      }
      toast.success(`Hoş geldiniz, ${data.user.firstName}`);
      navigate(from ?? (data.user.role === 'ADMIN' && admin ? '/admin' : '/'), { replace: true });
    } catch (e) {
      applyServerErrors(e, form.setError, ['email', 'password']);
    }
  });

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">{admin ? 'Yönetici Girişi' : 'Giriş Yap'}</h1>
      <p className="mt-2 text-sm text-secondary">
        {admin ? 'Yönetim paneline erişmek için yönetici hesabınızla giriş yapın.' : 'Siparişlerinizi takip edin, favorilerinize her cihazdan ulaşın.'}
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Input label="E-posta" type="email" autoComplete="email" {...form.register('email')} error={form.formState.errors.email?.message} />
        <PasswordInput label="Şifre" autoComplete="current-password" {...form.register('password')} error={form.formState.errors.password?.message} />
        {form.formState.errors.root && (
          <p className="error-text" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}
        {!admin && (
          <div className="flex justify-end">
            <Link to="/sifremi-unuttum" className="text-sm text-secondary underline-offset-4 hover:underline">
              Şifremi unuttum
            </Link>
          </div>
        )}
        <Button type="submit" fullWidth size="lg" loading={login.isPending}>
          Giriş Yap
        </Button>
      </form>
      {!admin && (
        <p className="mt-6 text-center text-sm text-secondary">
          Hesabınız yok mu?{' '}
          <Link to="/kayit" state={{ from }} className="font-medium text-primary underline-offset-4 hover:underline">
            Kayıt olun
          </Link>
        </p>
      )}
      {admin && (
        <p className="mt-6 rounded-md bg-surface-muted p-3 text-xs text-secondary">
          Demo yönetici: <code>admin@example.com</code> / <code>Admin12345</code>
        </p>
      )}
    </div>
  );
}
