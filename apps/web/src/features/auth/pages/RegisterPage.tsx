import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import { registerSchema, type RegisterInput } from '@shop/shared';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input, PasswordInput } from '@/components/ui/Input';
import { usePageTitle } from '@/hooks/usePageTitle';
import { applyServerErrors } from '@/lib/forms';
import { toast } from '@/store/ui.store';
import { useRegister } from '../useAuth';

type FormValues = z.input<typeof registerSchema>;

export default function RegisterPage() {
  usePageTitle('Kayıt Ol');
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const register = useRegister();
  const form = useForm<FormValues, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', password: '', passwordConfirm: '', acceptTerms: undefined },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const data = await register.mutateAsync(values);
      toast.success('Hesabınız oluşturuldu', `Hoş geldiniz, ${data.user.firstName}!`);
      navigate(from ?? '/', { replace: true });
    } catch (e) {
      applyServerErrors(e, form.setError, ['firstName', 'lastName', 'email', 'phone', 'password', 'passwordConfirm', 'acceptTerms']);
    }
  });

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">Hesap Oluştur</h1>
      <p className="mt-2 text-sm text-secondary">Birkaç saniyede kayıt olun; siparişlerinizi ve favorilerinizi tek yerden yönetin.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input label="Ad" autoComplete="given-name" {...form.register('firstName')} error={errors.firstName?.message} />
          <Input label="Soyad" autoComplete="family-name" {...form.register('lastName')} error={errors.lastName?.message} />
        </div>
        <Input label="E-posta" type="email" autoComplete="email" {...form.register('email')} error={errors.email?.message} />
        <Input label="Telefon (isteğe bağlı)" type="tel" autoComplete="tel" placeholder="05xx xxx xx xx" {...form.register('phone')} error={errors.phone?.message} />
        <PasswordInput label="Şifre" autoComplete="new-password" hint="En az 8 karakter, bir harf ve bir rakam" {...form.register('password')} error={errors.password?.message} />
        <PasswordInput label="Şifre (tekrar)" autoComplete="new-password" {...form.register('passwordConfirm')} error={errors.passwordConfirm?.message} />
        <Checkbox
          label={
            <span>
              <Link to="/yardim/sss" className="underline underline-offset-4" target="_blank" rel="noreferrer">
                Kullanım koşullarını
              </Link>{' '}
              ve KVKK aydınlatma metnini okudum, kabul ediyorum.
            </span>
          }
          {...form.register('acceptTerms', { setValueAs: (v: boolean) => (v ? true : undefined) })}
          error={errors.acceptTerms?.message}
        />
        {errors.root && (
          <p className="error-text" role="alert">
            {errors.root.message}
          </p>
        )}
        <Button type="submit" fullWidth size="lg" loading={register.isPending}>
          Kayıt Ol
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-secondary">
        Zaten hesabınız var mı?{' '}
        <Link to="/giris" state={{ from }} className="font-medium text-primary underline-offset-4 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
