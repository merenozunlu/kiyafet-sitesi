import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import LoginPage from './LoginPage';

describe('LoginPage', () => {
  it('boş gönderimde alan hatalarını gösterir', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'Giriş Yap' }));
    expect(await screen.findByText('E-posta zorunludur')).toBeInTheDocument();
    expect(screen.getByText('Şifre zorunludur')).toBeInTheDocument();
  });

  it('kayıt ve şifre sıfırlama bağlantılarını içerir', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('link', { name: /kayıt olun/i })).toHaveAttribute('href', '/kayit');
    expect(screen.getByRole('link', { name: /şifremi unuttum/i })).toHaveAttribute('href', '/sifremi-unuttum');
  });
});
