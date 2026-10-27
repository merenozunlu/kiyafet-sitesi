import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProductVariantDto } from '@shop/shared';
import { SizeSelector } from './VariantSelector';

const variant = (size: ProductVariantDto['size'], stock: number): ProductVariantDto => ({
  id: `v-${size}`,
  sku: `SKU-${size}`,
  size,
  color: 'Siyah',
  colorHex: '#000000',
  stockQuantity: stock,
  priceCents: 10000,
  isActive: true,
});

function Harness({ error }: { error?: string | null }) {
  const [size, setSize] = useState<ProductVariantDto['size'] | null>(null);
  return (
    <SizeSelector
      value={size}
      onChange={setSize}
      error={error}
      options={[
        { size: 'S', variant: variant('S', 0) },
        { size: 'M', variant: variant('M', 4) },
        { size: 'L', variant: variant('L', 2) },
        { size: 'XL', variant: null },
        { size: 'XXL', variant: variant('XXL', 10) },
      ]}
    />
  );
}

describe('SizeSelector', () => {
  it('stoksuz bedeni devre dışı bırakır', () => {
    render(<Harness />);
    expect(screen.getByTestId('size-S')).toBeDisabled();
    expect(screen.getByTestId('size-XL')).toBeDisabled();
    expect(screen.getByTestId('size-M')).toBeEnabled();
  });

  it('beden seçimini bildirir', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByTestId('size-M'));
    expect(screen.getByTestId('size-M')).toHaveAttribute('aria-checked', 'true');
  });

  it('zorunlu beden hatasını gösterir', () => {
    render(<Harness error="Lütfen beden seçin" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Lütfen beden seçin');
  });
});
