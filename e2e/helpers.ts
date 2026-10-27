import { expect, type Page } from '@playwright/test';

export const CUSTOMER = { email: 'musteri@example.com', password: 'Musteri12345' };
export const ADMIN = { email: 'admin@example.com', password: 'Admin12345' };

export async function addFirstAvailableProduct(page: Page) {
  await page.goto('/urunler');
  await expect(page.getByTestId('product-card').first()).toBeVisible();
  await page.getByTestId('product-card').first().locator('h3 a').click();
  await expect(page.getByTestId('add-to-cart')).toBeVisible();
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  for (const s of sizes) {
    const btn = page.getByTestId(`size-${s}`);
    if (await btn.isEnabled()) {
      await btn.click();
      await expect(btn).toHaveAttribute('aria-checked', 'true');
      break;
    }
  }
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByText('Sepete eklendi')).toBeVisible({ timeout: 10_000 });
}

export async function login(page: Page, email: string, password: string, path = '/giris') {
  await page.goto(path);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
}

export const guestAddress = {
  firstName: 'Deniz',
  lastName: 'Kaya',
  phone: '05551234567',
  city: 'İstanbul',
  district: 'Beşiktaş',
  line: 'Sinanpaşa Mah. Deneme Sok. No:5 D:3',
};
