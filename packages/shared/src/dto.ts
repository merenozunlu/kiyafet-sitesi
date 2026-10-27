import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  Size,
  UserRole,
} from './constants';

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
}

export interface ProductImageDto {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  size: Size;
  color: string;
  colorHex: string | null;
  stockQuantity: number;
  priceCents: number;
  isActive: boolean;
}

export interface ProductListItemDto {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  discountPercent: number | null;
  category: { id: string; name: string; slug: string };
  image: ProductImageDto | null;
  isNew: boolean;
  isFeatured: boolean;
  inStock: boolean;
  availableSizes: Size[];
  colors: { name: string; hex: string | null }[];
  createdAt: string;
}

export interface ProductDetailDto extends ProductListItemDto {
  description: string;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
  status: ProductStatus;
  categoryId: string;
}

export interface ProductFacetsDto {
  sizes: Size[];
  colors: { name: string; hex: string | null }[];
  priceRange: { minCents: number; maxCents: number };
}

export interface ProductListResponseDto {
  data: ProductListItemDto[];
  meta: PaginationMeta;
  facets: ProductFacetsDto;
}

export interface SearchResponseDto {
  products: ProductListItemDto[];
  categories: CategoryDto[];
}

export interface AddressDto {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  postalCode: string | null;
  line: string;
  isDefault: boolean;
}

export type AddressSnapshot = Omit<AddressDto, 'id' | 'isDefault'>;

export type CartItemWarning = 'OUT_OF_STOCK' | 'QUANTITY_REDUCED' | 'PRICE_CHANGED' | 'INACTIVE';

export interface CartItemDto {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  size: Size;
  color: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  stockQuantity: number;
  warning: CartItemWarning | null;
}

export interface CartSummaryDto {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  freeShippingThresholdCents: number;
  itemCount: number;
}

export interface CartDto {
  items: CartItemDto[];
  summary: CartSummaryDto;
  warnings: string[];
}

export interface OrderItemDto {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantSku: string;
  size: Size;
  color: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderStatusHistoryDto {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  trackingNumber: string | null;
  createdAt: string;
}

export interface OrderPaymentDto {
  provider: string;
  reference: string;
  status: PaymentStatus;
  cardLast4: string | null;
  bankTransferInstructions: {
    bankName: string;
    iban: string;
    accountHolder: string;
    reference: string;
  } | null;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  shippingAddress: AddressSnapshot;
  items: OrderItemDto[];
  statusHistory: OrderStatusHistoryDto[];
  payment: OrderPaymentDto | null;
  trackingNumber: string | null;
  note: string | null;
  customerEmail: string;
  customer: { id: string | null; firstName: string; lastName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDashboardDto {
  totals: {
    orders: number;
    pendingOrders: number;
    completedOrders: number;
    revenueCents: number;
    products: number;
    lowStockVariants: number;
    customers: number;
  };
  recentOrders: OrderDto[];
  salesByDay: { date: string; revenueCents: number; orders: number }[];
  lowStock: {
    productId: string;
    productName: string;
    sku: string;
    size: Size;
    color: string;
    stockQuantity: number;
  }[];
}

export interface AdminCustomerDto extends UserDto {
  isActive: boolean;
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: string | null;
}

export interface AuditLogDto {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
