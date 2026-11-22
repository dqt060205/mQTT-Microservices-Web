import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Home from './pages/Home.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import Login from './pages/Login.jsx';
import AdminProducts from './pages/AdminProducts.jsx';
import AdminProductForm from './components/AdminProductForm.jsx';
import { useAuth } from './context/AuthContext.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="state">Loading…</p>;
  return user ? children : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="state">Loading…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return user.role === 'admin' ? children : <p className="state">Administrator permission is required.</p>;
}

export default function App() {
  return (
    <>
      <Header />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/admin/products" element={<RequireAdmin><AdminProducts /></RequireAdmin>} />
          <Route path="/admin/products/new" element={<RequireAdmin><AdminProductForm /></RequireAdmin>} />
          <Route path="/admin/products/:id/edit" element={<RequireAdmin><AdminProductForm /></RequireAdmin>} />
          <Route path="*" element={<p className="state">Page not found.</p>} />
        </Routes>
      </main>
      <footer className="footer">mQTT - IoT boards, sensors and tutorials</footer>
    </>
  );
}
