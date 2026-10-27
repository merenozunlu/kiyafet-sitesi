import type { OrderStatus, PaymentStatus } from '@shop/shared';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@shop/shared';
import { Badge, type BadgeVariant } from './Badge';

const orderVariants: Record<OrderStatus, BadgeVariant> = {
  PENDING: 'warning',
  CONFIRMED: 'accent',
  PREPARING: 'accent',
  SHIPPED: 'neutral',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURNED: 'outline',
};

const paymentVariants: Record<PaymentStatus, BadgeVariant> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'outline',
  PARTIALLY_REFUNDED: 'outline',
};

export function OrderStatusBadge({ status, size }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  return (
    <Badge variant={orderVariants[status]} size={size}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status, size }: { status: PaymentStatus; size?: 'sm' | 'md' }) {
  return (
    <Badge variant={paymentVariants[status]} size={size}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
