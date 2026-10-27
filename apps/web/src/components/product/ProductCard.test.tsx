import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProductListItemDto } from '@shop/shared';
import { ProductCard } from './ProductCard';
import { renderWithProviders } from '@/test/render';
import { useGuestFavoritesStore } from '@/store/guest-favorites.store';

const product: ProductListItemDto = {
  id: 'p1',
  name: 'Organik Pamuk Tişört',
  slug: 'organik-pamuk-tisort',
  priceCents: 49900,
  compareAtPriceCents: 69900,
  discountPercent: 29,
  category: { id: 'c1', name: 'Tişört', slug: 'tisort' },
  image: { id: 'i1', imageUrl: 'https://example.com/a.jpg', altText: 'Tişört', sortOrder: 0 },
  isNew: true,
  isFeatured: false,
  inStock: true,
  availableSizes: ['S', 'M', 'L'],
  colors: [{ name: 'Siyah', hex: '#111111' }],
  createdAt: new Date().toISOString(),
};

describe('ProductCard', () => {
  it('ürün adını, fiyatı ve indirim rozetini gösterir', () => {
    renderWithProviders(<ProductCard product={product} />);
    expect(screen.getByText('Organik Pamuk Tişört')).toBeInTheDocument();
    expect(screen.getByText(/%29 indirim/)).toBeInTheDocument();
    expect(screen.getByText('Yeni')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Organik Pamuk Tişört/ })[0]).toHaveAttribute('href', '/urun/organik-pamuk-tisort');
  });

  it('favori düğmesi misafir listesine ekler', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCard product={product} />);
    await user.click(screen.getByRole('button', { name: /favorilere ekle/i }));
    expect(useGuestFavoritesStore.getState().productIds).toContain('p1');
  });
});
