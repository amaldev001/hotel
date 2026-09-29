import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ConfigProvider } from "./context/ConfigContext";
import { ToastProvider } from "./components/common/Toast";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import CartBar from "./components/common/CartBar";
import Skeleton from "./components/common/Skeleton";

const Home = lazy(() => import("./pages/Home"));
const RestaurantList = lazy(() => import("./pages/RestaurantList"));
const RestaurantDetail = lazy(() => import("./pages/RestaurantDetail"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));

const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentStatusPage = lazy(() => import("./pages/PaymentStatusPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

const RestaurantDashboard = lazy(() => import("./pages/RestaurantDashboard"));
const RestaurantOrders = lazy(() => import("./pages/RestaurantOrders"));
const MenuManager = lazy(() => import("./pages/MenuManager"));
const RestaurantProfilePage = lazy(() => import("./pages/RestaurantProfilePage"));
const RestaurantSettings = lazy(() => import("./pages/RestaurantSettings"));

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminRestaurants = lazy(() => import("./pages/AdminRestaurants"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12">
        <Skeleton className="h-64" count={1} />
      </div>
    );
  }

  if (!user) {
    const returnPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnPath=${returnPath}`} replace />;
  }

  if (user.mustChangePassword) {
    const cpPath =
      user.role === "restaurant" ? "/restaurant/change-password" :
      user.role === "admin" ? "/admin/change-password" :
      "/change-password";
    if (location.pathname !== cpPath) return <Navigate to={cpPath} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home =
      user.role === "admin" ? "/admin/dashboard" :
      user.role === "restaurant" ? "/restaurant/dashboard" :
      "/";
    return <Navigate to={home} replace />;
  }

  return children;
};

const PageLoader = () => (
  <div className="max-w-7xl mx-auto px-4 py-12">
    <Skeleton className="h-64" count={1} />
  </div>
);

export const AppContent = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0e0d0c] text-[#f5ede6]">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/restaurants" element={<RestaurantList />} />
            <Route path="/restaurants/:id" element={<RestaurantDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />

            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

            <Route path="/cart" element={<ProtectedRoute allowedRoles={["customer"]}><CartPage /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute allowedRoles={["customer"]}><CheckoutPage /></ProtectedRoute>} />
            <Route path="/checkout/payment-status/:id" element={<ProtectedRoute allowedRoles={["customer"]}><PaymentStatusPage /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute allowedRoles={["customer"]}><OrdersPage /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

            <Route path="/restaurant" element={<Navigate to="/restaurant/dashboard" replace />} />
            <Route path="/restaurant/dashboard" element={<ProtectedRoute allowedRoles={["restaurant"]}><RestaurantDashboard /></ProtectedRoute>} />
            <Route path="/restaurant/orders" element={<ProtectedRoute allowedRoles={["restaurant"]}><RestaurantOrders /></ProtectedRoute>} />
            <Route path="/restaurant/menu" element={<ProtectedRoute allowedRoles={["restaurant"]}><MenuManager /></ProtectedRoute>} />
            <Route path="/restaurant/profile" element={<ProtectedRoute allowedRoles={["restaurant"]}><RestaurantProfilePage /></ProtectedRoute>} />
            <Route path="/restaurant/settings" element={<ProtectedRoute allowedRoles={["restaurant"]}><RestaurantSettings /></ProtectedRoute>} />
            <Route path="/restaurant/change-password" element={<ProtectedRoute allowedRoles={["restaurant"]}><ChangePassword /></ProtectedRoute>} />
            <Route path="/restaurant/notifications" element={<ProtectedRoute allowedRoles={["restaurant"]}><NotificationsPage /></ProtectedRoute>} />

            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/restaurants" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRestaurants /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={["admin"]}><AdminOrders /></ProtectedRoute>} />
            <Route path="/admin/change-password" element={<ProtectedRoute allowedRoles={["admin"]}><ChangePassword /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <CartBar />
    </div>
  );
};

export const App = () => {
  return (
    <ErrorBoundary>
      <ConfigProvider>
        <AuthProvider>
          <ToastProvider>
            <Router>
              <AppContent />
            </Router>
          </ToastProvider>
        </AuthProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;
