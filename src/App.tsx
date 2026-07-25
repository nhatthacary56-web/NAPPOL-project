import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './pages/HomePage'
import { MallPage } from './pages/MallPage'
import { LivePage } from './pages/LivePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { AccountPage } from './pages/AccountPage'
import { CartPage } from './pages/CartPage'
import { SearchPage } from './pages/SearchPage'
import { ProductPage } from './pages/ProductPage'
import { CategoryPage } from './pages/CategoryPage'
import { ShopPage } from './pages/ShopPage'
import { LoginPage } from './pages/LoginPage'
import { LineCallbackPage } from './pages/LineCallbackPage'
import { RegisterPage } from './pages/RegisterPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { ShippingLabelPage } from './pages/ShippingLabelPage'
import { WishlistPage } from './pages/WishlistPage'
import { VouchersPage } from './pages/VouchersPage'
import { SettingsPage } from './pages/SettingsPage'
import { AddressesPage } from './pages/AddressesPage'
import { HelpCenterPage } from './pages/HelpCenterPage'
import { AdminShell } from './pages/admin/AdminShell'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminVouchersPage } from './pages/admin/AdminVouchersPage'
import { AdminShopsPage } from './pages/admin/AdminShopsPage'
import { AdminBrandPage } from './pages/admin/AdminBrandPage'
import { AdminWalletPage } from './pages/admin/AdminWalletPage'
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage'
import { AdminBannersPage } from './pages/admin/AdminBannersPage'
import { AdminReportsPage } from './pages/admin/AdminReportsPage'
import { AdminReturnsPage } from './pages/admin/AdminReturnsPage'
import { AdminFlashPage } from './pages/admin/AdminFlashPage'
import { AdminAppContentPage } from './pages/admin/AdminAppContentPage'
import { AdminHelpPage } from './pages/admin/AdminHelpPage'
import { AdminFeedPage } from './pages/admin/AdminFeedPage'
import { SellerShell } from './pages/seller/SellerShell'
import { SellerDashboardPage } from './pages/seller/SellerDashboardPage'
import { SellerProductsPage } from './pages/seller/SellerProductsPage'
import { SellerOrdersPage } from './pages/seller/SellerOrdersPage'
import { SellerShopPage } from './pages/seller/SellerShopPage'
import { SellerWalletPage } from './pages/seller/SellerWalletPage'
import { SellerReturnsPage } from './pages/seller/SellerReturnsPage'
import { ChatListPage } from './pages/ChatListPage'
import { ChatThreadPage } from './pages/ChatThreadPage'
import { useStore } from './store/StoreContext'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useStore()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="admin/login" element={<AdminLoginPage />} />
      <Route path="admin" element={<AdminShell />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="shops" element={<AdminShopsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="vouchers" element={<AdminVouchersPage />} />
        <Route path="wallet" element={<AdminWalletPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="returns" element={<AdminReturnsPage />} />
        <Route path="app-content" element={<AdminAppContentPage />} />
        <Route path="help" element={<AdminHelpPage />} />
        <Route path="feed" element={<AdminFeedPage />} />
        <Route path="banners" element={<AdminBannersPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="flash" element={<AdminFlashPage />} />
        <Route path="brand" element={<AdminBrandPage />} />
      </Route>

      <Route path="seller" element={<SellerShell />}>
        <Route index element={<SellerDashboardPage />} />
        <Route path="products" element={<SellerProductsPage />} />
        <Route path="orders" element={<SellerOrdersPage />} />
        <Route path="returns" element={<SellerReturnsPage />} />
        <Route path="wallet" element={<SellerWalletPage />} />
        <Route path="shop" element={<SellerShopPage />} />
      </Route>

      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="mall" element={<MallPage />} />
        <Route path="live" element={<LivePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>

      <Route path="cart" element={<CartPage />} />
      <Route path="search" element={<SearchPage />} />
      <Route path="product/:id" element={<ProductPage />} />
      <Route path="category/:slug" element={<CategoryPage />} />
      <Route path="shop/:slug" element={<ShopPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="login/line/callback" element={<LineCallbackPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="wishlist" element={<WishlistPage />} />
      <Route path="vouchers" element={<VouchersPage />} />
      <Route path="help" element={<HelpCenterPage />} />

      <Route
        path="checkout"
        element={
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        }
      />
      <Route
        path="orders"
        element={
          <RequireAuth>
            <OrdersPage />
          </RequireAuth>
        }
      />
      <Route
        path="orders/:id"
        element={
          <RequireAuth>
            <OrderDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="orders/:id/label"
        element={
          <RequireAuth>
            <ShippingLabelPage />
          </RequireAuth>
        }
      />
      <Route
        path="chats"
        element={
          <RequireAuth>
            <ChatListPage />
          </RequireAuth>
        }
      />
      <Route
        path="chats/:id"
        element={
          <RequireAuth>
            <ChatThreadPage />
          </RequireAuth>
        }
      />
      <Route
        path="settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="addresses"
        element={
          <RequireAuth>
            <AddressesPage />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
