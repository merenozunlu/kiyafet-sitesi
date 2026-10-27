import { expect, test } from '@playwright/test';
import { addFirstAvailableProduct, ADMIN, CUSTOMER, guestAddress, login } from './helpers';

test('1) katalog: ürün listesi, detay, beden seçimi ve sepete ekleme', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await page.goto('/urunler');
  await expect(page.getByTestId('product-card').first()).toBeVisible();
  await addFirstAvailableProduct(page);
  await page.goto('/sepet');
  await expect(page.getByRole('heading', { name: 'Sepetim' })).toBeVisible();
  await expect(page.getByTestId('go-to-checkout')).toBeEnabled();
});

test('2) misafir kapıda ödeme ile sipariş tamamlar', async ({ page }) => {
  await addFirstAvailableProduct(page);
  await page.goto('/sepet');
  await page.getByTestId('go-to-checkout').click();
  await page.getByLabel('E-posta').fill('e2e-misafir@example.com');
  await page.getByLabel('Ad', { exact: true }).fill(guestAddress.firstName);
  await page.getByLabel('Soyad').fill(guestAddress.lastName);
  await page.getByLabel('Telefon').fill(guestAddress.phone);
  await page.getByLabel('İl', { exact: true }).fill(guestAddress.city);
  await page.getByLabel('İlçe').fill(guestAddress.district);
  await page.getByLabel('Açık adres').fill(guestAddress.line);
  await page.getByTestId('checkout-next').click();
  await page.getByText('Kapıda Ödeme').click();
  await page.getByTestId('checkout-next').click();
  await page.getByTestId('place-order').click();
  await expect(page.getByTestId('order-number')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('order-number')).toHaveText(/AT-/);
});

test('3) müşteri girişi ve siparişlerim', async ({ page }) => {
  await login(page, CUSTOMER.email, CUSTOMER.password);
  await expect(page.getByRole('link', { name: /Hesabım/ })).toBeVisible();
  await page.getByRole('link', { name: /Hesabım/ }).click();
  await page.getByRole('link', { name: 'Siparişlerim' }).click();
  await expect(page.getByRole('heading', { name: 'Siparişlerim' })).toBeVisible();
});

test('4) kredi kartı (mock) başarılı ödeme', async ({ page }) => {
  await addFirstAvailableProduct(page);
  await page.goto('/sepet');
  await page.getByTestId('go-to-checkout').click();
  await page.getByLabel('E-posta').fill('kart@example.com');
  await page.getByLabel('Ad', { exact: true }).fill(guestAddress.firstName);
  await page.getByLabel('Soyad').fill(guestAddress.lastName);
  await page.getByLabel('Telefon').fill(guestAddress.phone);
  await page.getByLabel('İl', { exact: true }).fill(guestAddress.city);
  await page.getByLabel('İlçe').fill(guestAddress.district);
  await page.getByLabel('Açık adres').fill(guestAddress.line);
  await page.getByTestId('checkout-next').click();
  await page.getByText('Kredi / Banka Kartı').click();
  await page.getByLabel('Kart üzerindeki isim').fill('DENIZ KAYA');
  await page.getByTestId('card-number').fill('4111111111111111');
  await page.locator('select[name="card.expMonth"]').selectOption('12');
  await page.locator('select[name="card.expYear"]').selectOption('2030');
  await page.locator('input[name="card.cvc"]').fill('123');
  await page.getByTestId('checkout-next').click();
  await page.getByTestId('place-order').click();
  await expect(page.getByTestId('order-number')).toBeVisible({ timeout: 20_000 });
});

test('5) yönetici girişi ve sipariş listesi', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password, '/admin/giris');
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole('heading', { name: 'Genel Bakış' })).toBeVisible();
  await page.goto('/admin/siparisler');
  await expect(page.getByRole('heading', { name: 'Siparişler' })).toBeVisible();
});
