import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';

export default function Cart() {
  const { user } = useAuth();
  const { items, count, subtotal, update, remove } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const run = async (fn) => {
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
  };

  if (!user) {
    return (
      <div className="panel center">
        <h1>Your cart is waiting</h1>
        <p>Sign in to see the items you added.</p>
        <Link to="/login" state={{ from: '/cart' }} className="btn btn-yellow">Sign in</Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="panel center">
        <h1>Your cart is empty</h1>
        <p>Find boards and sensors for your next build.</p>
        <Link to="/" className="btn btn-yellow">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <section className="panel">
        <h1>Shopping Cart</h1>
        {error && <p className="state error">{error}</p>}
        {items.map(({ id, quantity, product }) => (
          <div key={id} className="cart-row">
            <Link to={`/products/${product.id}`}><ProductImage product={product} size="sm" /></Link>
            <div className="cart-info">
              <Link to={`/products/${product.id}`}><h3>{product.name}</h3></Link>
              <p className="instock">In stock</p>
              <div className="cart-actions">
                <label>Qty
                  <select value={quantity} onChange={(e) => run(() => update(id, Number(e.target.value)))}>
                    {Array.from({ length: Math.min(product.stock ?? 10, 10) }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}
                  </select>
                </label>
                <button className="linkbtn" onClick={() => run(() => remove(id))}>Delete</button>
              </div>
            </div>
            <p className="price">{formatPrice(product.price * quantity)}</p>
          </div>
        ))}
        <p className="subtotal-line">Subtotal ({count} items): <b>{formatPrice(subtotal)}</b></p>
      </section>

      <aside className="panel buybox">
        <p>Subtotal ({count} items): <b className="price">{formatPrice(subtotal)}</b></p>
        <button className="btn btn-yellow btn-block" onClick={() => navigate('/checkout')}>Proceed to checkout</button>
      </aside>
    </div>
  );
}
