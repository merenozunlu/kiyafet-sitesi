import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { StorefrontLayout } from '@/app/layouts/StorefrontLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { RedirectIfAuthenticated, RequireAdmin, RequireAuth } from './guards';
import { RouteErrorBoundary } from './RouteErrorBoundary';

// Vitrin
const HomePage = lazy(() => import('@/features/catalog/pages/HomePage'));
const ProductListPage = lazy(() => import('@/features/catalog/pages/ProductListPage'));
const ProductDetailPage = lazy(() => import('@/features/catalog/pages/ProductDetailPage'));
const SearchPage = lazy(() => import('@/features/catalog/pages/SearchPage'));
const FavoritesPage = lazy(() => import('@/features/favorites/pages/FavoritesPage'));
const CartPage = lazy(() => import('@/features/cart/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/features/checkout/pages/CheckoutPage'));
const OrderCompletePage = lazy(() => import('@/features/checkout/pages/OrderCompletePage'));
const HelpPage = lazy(() => import('@/features/catalog/pages/HelpPage'));
const NotFoundPage = lazy(() => import('@/features/catalog/pages/NotFoundPage'));

// Hesap
const AccountLayout = lazy(() => import('@/features/account/pages/AccountLayout'));
const AccountOverviewPage = lazy(() => import('@/features/account/pages/AccountOverviewPage'));
const ProfilePage = lazy(() => import('@/features/account/pages/ProfilePage'));
const AddressesPage = lazy(() => import('@/features/account/pages/AddressesPage'));
const OrdersPage = lazy(() => import('@/features/orders/pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/features/orders/pages/OrderDetailPage'));

// Auth
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));

// Admin
const AdminLoginPage = lazy(() => import('@/features/admin/pages/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('@/features/admin/pages/AdminProductsPage'));
const AdminProductFormPage = lazy(() => import('@/features/admin/pages/AdminProductFormPage'));
const AdminCategoriesPage = lazy(() => import('@/features/admin/pages/AdminCategoriesPage'));
const AdminOrdersPage = lazy(() => import('@/features/admin/pages/AdminOrdersPage'));
const AdminOrderDetailPage = lazy(() => import('@/features/admin/pages/AdminOrderDetailPage'));
const AdminCustomersPage = lazy(() => import('@/features/admin/pages/AdminCustomersPage'));
const AdminAuditLogsPage = lazy(() => import('@/features/admin/pages/AdminAuditLogsPage'));

const router = createBrowserRouter([
  {
    element: <StorefrontLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/urunler', element: <ProductListPage /> },
      { path: '/kategori/:slug', element: <ProductListPage /> },
      { path: '/urun/:slug', element: <ProductDetailPage /> },
      { path: '/arama', element: <SearchPage /> },
      { path: '/favoriler', element: <FavoritesPage /> },
      { path: '/sepet', element: <CartPage /> },
      { path: '/odeme', element: <CheckoutPage /> },
      { path: '/siparis-tamamlandi/:orderNumber', element: <OrderCompletePage /> },
      { path: '/yardim/:topic', element: <HelpPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/hesap',
            element: <AccountLayout />,
            children: [
              { index: true, element: <AccountOverviewPage /> },
              { path: 'profil', element: <ProfilePage /> },
              { path: 'adresler', element: <AddressesPage /> },
              { path: 'siparisler', element: <OrdersPage /> },
              { path: 'siparisler/:id', element: <OrderDetailPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <RedirectIfAuthenticated />,
        children: [
          { path: '/giris', element: <LoginPage /> },
          { path: '/kayit', element: <RegisterPage /> },
          { path: '/admin/giris', element: <AdminLoginPage /> },
        ],
      },
      { path: '/sifremi-unuttum', element: <ForgotPasswordPage /> },
      { path: '/sifre-yenile', element: <ResetPasswordPage /> },
    ],
  },
  {
    path: '/admin',
    element: <RequireAdmin />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'urunler', element: <AdminProductsPage /> },
          { path: 'urunler/yeni', element: <AdminProductFormPage /> },
          { path: 'urunler/:id', element: <AdminProductFormPage /> },
          { path: 'kategoriler', element: <AdminCategoriesPage /> },
          { path: 'siparisler', element: <AdminOrdersPage /> },
          { path: 'siparisler/:id', element: <AdminOrderDetailPage /> },
          { path: 'musteriler', element: <AdminCustomersPage /> },
          { path: 'islem-kayitlari', element: <AdminAuditLogsPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
