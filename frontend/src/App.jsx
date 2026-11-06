import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import Chatbot from './components/Chatbot';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import AdminLayout from './layouts/AdminLayout';
import AdminApplicationMethods from './pages/admin/AdminApplicationMethods';
import AdminCrops from './pages/admin/AdminCrops';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProblems from './pages/admin/AdminProblems';
import AdminProducts from './pages/admin/AdminProducts';
import AdminUsers from './pages/admin/AdminUsers';
import Landing from './pages/Landing';
import Login from './pages/Login';
import MyOrders from './pages/MyOrders';
import ProductDetails from './pages/ProductDetails';
import Products from './pages/Products';
import Profile from './pages/Profile';
import Recommendation from './pages/Recommendation';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Public & Farmer Storefront Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/products" element={<Products />} />
            <Route path="/recommendation" element={<Recommendation />} />
            <Route path="/products/:productId" element={<ProductDetails />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin Protected Routes */}
            <Route element={<AdminProtectedRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="crops" element={<AdminCrops />} />
                <Route path="problems" element={<AdminProblems />} />
                <Route path="application-methods" element={<AdminApplicationMethods />} />
                <Route path="users" element={<AdminUsers />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Chatbot />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
