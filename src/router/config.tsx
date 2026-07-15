import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import UserPage from "../pages/user/page";
import LoginPage from "../pages/login/page";
import AdminLogin from "../pages/admin/login/page";
import AdminDashboard from "../pages/admin/dashboard/page";
import AdminProducts from "../pages/admin/products/page";
import AdminCategories from "../pages/admin/categories/page";
import AdminDrawsPage from "../pages/admin/draws/page";
import AdminWinnersPage from "../pages/admin/winners/page";
import AdminShippingPage from "../pages/admin/shipping/page";
import AdminUsersPage from "../pages/admin/users/page";
import AdminsManagement from "../pages/admin/admins/page";
import AdminMessagesPage from "../pages/admin/messages/page";
import AdminSettingsPage from "../pages/admin/settings/page";
import GuidePage from "../pages/guide/page";
import ContactPage from "../pages/contact/page";
import TermsPage from "../pages/terms/page";
import PrivacyPage from "../pages/privacy/page";
import ShippingPolicyPage from "../pages/shipping-policy/page";
import RefundPolicyPage from "../pages/refund-policy/page";
import ProductsPage from "../pages/products/page";
import ProductDetailPage from "../pages/product-detail/page";
import ResetPasswordPage from "../pages/reset-password/page";
import ShopPage from "../pages/shop/page";
import ShopDetailPage from "../pages/shop-detail/page";
import AdminShopProductsPage from "../pages/admin/shop-products/page";
import AdminShopShippingPage from "../pages/admin/shop-shipping/page";
import AdminMfaVerify from "../pages/admin/mfa-verify/page";
import AdminMfaSetup from "../pages/admin/mfa-setup/page";
import MfaVerifyPage from "../pages/mfa-verify/page";
import MfaSetupPage from "../pages/mfa-setup/page";
import BuyPointsPage from "../pages/buy-points/page";

const routes: RouteObject[] = [
  { path: "/", element: <Home /> },
  { path: "/products", element: <ProductsPage /> },
  { path: "/product/:id", element: <ProductDetailPage /> },
  { path: "/shop", element: <ShopPage /> },
  { path: "/shop/:id", element: <ShopDetailPage /> },
  { path: "/buy-points", element: <BuyPointsPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/user", element: <UserPage /> },
  { path: "/guide", element: <GuidePage /> },
  { path: "/contact", element: <ContactPage /> },
  { path: "/terms", element: <TermsPage /> },
  { path: "/privacy", element: <PrivacyPage /> },
  { path: "/shipping-policy", element: <ShippingPolicyPage /> },
  { path: "/refund-policy", element: <RefundPolicyPage /> },
  { path: "/admin/login", element: <AdminLogin /> },
  { path: "/admin/mfa-verify", element: <AdminMfaVerify /> },
  { path: "/admin/mfa-setup", element: <AdminMfaSetup /> },
  { path: "/admin/dashboard", element: <AdminDashboard /> },
  { path: "/admin/products", element: <AdminProducts /> },
  { path: "/admin/categories", element: <AdminCategories /> },
  { path: "/admin/draws", element: <AdminDrawsPage /> },
  { path: "/admin/winners", element: <AdminWinnersPage /> },
  { path: "/admin/shipping", element: <AdminShippingPage /> },
  { path: "/admin/shop-products", element: <AdminShopProductsPage /> },
  { path: "/admin/shop-shipping", element: <AdminShopShippingPage /> },
  { path: "/admin/users", element: <AdminUsersPage /> },
  { path: "/admin/admins", element: <AdminsManagement /> },
  { path: "/admin/messages", element: <AdminMessagesPage /> },
  { path: "/admin/settings", element: <AdminSettingsPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/mfa-verify", element: <MfaVerifyPage /> },
  { path: "/mfa-setup", element: <MfaSetupPage /> },
  { path: "*", element: <NotFound /> },
];

export default routes;