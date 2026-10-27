import { render, screen } from '@testing-library/react';
import { Price } from './Price';

describe('Price', () => {
  it('kuruşu Türk Lirası olarak biçimler', () => {
    render(<Price cents={129900} />);
    expect(screen.getByText(/1\.299,00/)).toBeInTheDocument();
  });

  it('indirimli fiyatta önceki tutarı üstü çizili gösterir', () => {
    render(<Price cents={99900} compareAtCents={129900} />);
    expect(screen.getByText(/999,00/)).toBeInTheDocument();
    expect(screen.getByText(/Önceki fiyat/)).toBeInTheDocument();
    expect(screen.getByText(/1\.299,00/)).toBeInTheDocument();
  });

  it('karşılaştırma fiyatı daha düşükse indirim göstermez', () => {
    render(<Price cents={129900} compareAtCents={10000} />);
    expect(screen.queryByText(/Önceki fiyat/)).not.toBeInTheDocument();
  });
});
