import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { z } from 'zod';
import { changePasswordSchema, updateProfileSchema, type ChangePasswordInput, type UpdateProfileInput } from '@shop/shared';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { usePageTitle } from '@/hooks/usePageTitle';
import { applyServerErrors } from '@/lib/forms';
import { formatDate } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';

type ProfileValues = z.input<typeof updateProfileSchema>;

export default function ProfilePage() {
  usePageTitle('Profil');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const profile = useForm<ProfileValues, unknown, UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '' },
  });
  const updateProfile = useMutation({ mutationFn: authService.updateProfile });
  const onProfile = profile.handleSubmit(async (values) => {
    try {
      const u = await updateProfile.mutateAsync(values);
      setUser(u);
      profile.reset({ firstName: u.firstName, lastName: u.lastName, phone: u.phone ?? '' });
      toast.success('Profil güncellendi');
    } catch (e) {
      applyServerErrors(e, profile.setError, ['firstName', 'lastName', 'phone']);
    }
  });

  const password = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' } });
  const changePassword = useMutation({ mutationFn: authService.changePassword });
  const onPassword = password.handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync(values);
      password.reset();
      toast.success('Şifreniz değiştirildi', 'Diğer cihazlardaki oturumlarınız kapatıldı.');
    } catch (e) {
      applyServerErrors(e, password.setError, ['currentPassword', 'newPassword', 'newPasswordConfirm']);
    }
  });

  return (
    <div className="space-y-10">
      <section className="rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold">Kişisel Bilgiler</h2>
        <p className="mt-1 text-sm text-secondary">
          E-posta: <span className="text-primary">{user?.email}</span> · Üyelik: {user ? formatDate(user.createdAt) : '—'}
        </p>
        <form onSubmit={onProfile} noValidate className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Ad" {...profile.register('firstName')} error={profile.formState.errors.firstName?.message} />
            <Input label="Soyad" {...profile.register('lastName')} error={profile.formState.errors.lastName?.message} />
          </div>
          <Input label="Telefon" type="tel" placeholder="05xx xxx xx xx" {...profile.register('phone')} error={profile.formState.errors.phone?.message} />
          {profile.formState.errors.root && (
            <p className="error-text" role="alert">
              {profile.formState.errors.root.message}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={updateProfile.isPending} disabled={!profile.formState.isDirty}>
              Kaydet
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold">Şifre Değiştir</h2>
        <form onSubmit={onPassword} noValidate className="mt-6 space-y-4">
          <PasswordInput label="Mevcut şifre" autoComplete="current-password" {...password.register('currentPassword')} error={password.formState.errors.currentPassword?.message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordInput label="Yeni şifre" autoComplete="new-password" {...password.register('newPassword')} error={password.formState.errors.newPassword?.message} />
            <PasswordInput label="Yeni şifre (tekrar)" autoComplete="new-password" {...password.register('newPasswordConfirm')} error={password.formState.errors.newPasswordConfirm?.message} />
          </div>
          {password.formState.errors.root && (
            <p className="error-text" role="alert">
              {password.formState.errors.root.message}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" variant="outline" loading={changePassword.isPending}>
              Şifreyi Güncelle
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-border p-6 text-sm text-secondary">
        <h2 className="text-lg font-semibold text-primary">Gizlilik</h2>
        <p className="mt-2">
          Kişisel verileriniz yalnızca siparişlerinizi işlemek için kullanılır. Kart bilgileriniz hiçbir zaman sunucularımızda saklanmaz. Hesap silme ve veri talepleri için{' '}
          <a href="/yardim/iletisim" className="underline underline-offset-4">
            bizimle iletişime geçin
          </a>
          .
        </p>
      </section>
    </div>
  );
}
