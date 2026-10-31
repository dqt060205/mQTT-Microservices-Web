import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import ProductImage from '../components/ProductImage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';

export default function Checkout() {
  const { user } = useAuth();
  const { items, count, subtotal, refresh } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ shippingName: user?.name || '', shippingPhone: '', shippingAddress: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  if (items.length === 0) {
    return (
      <div className="panel center">
        <h1>Nothing to check out</h1>
        <Link to="/" className="btn btn-yellow">Continue shopping</Link>
      </div>
    );
  }

  const placeOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const order = await api.createOrder(form);
      await refresh();
      navigate('/orders', { state: { placed: order }, replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <form className="cart-layout" onSubmit={placeOrder}>
      <section className="panel">
        <h1>Checkout</h1>

        <h2>1. Shipping address</h2>
        <label className="field">Full name
          <input value={form.shippingName} onChange={set('shippingName')} required maxLength={100} autoComplete="name" />
        </label>
        <label className="field">Phone number
          <input value={form.shippingPhone} onChange={set('shippingPhone')} required minLength={8} maxLength={20} inputMode="tel" autoComplete="tel" />
        </label>
        <label className="field">Address
          <input value={form.shippingAddress} onChange={set('shippingAddress')} required minLength={5} maxLength={255} autoComplete="street-address" />
        </label>

        <h2>2. Payment</h2>
        <p>Demo payment: the order is charged by a simulated payment service.</p>

        <h2>3. Review items</h2>
        {items.map(({ id, quantity, product }) => (
          <div key={id} className="cart-row">
            <ProductImage product={product} size="sm" />
            <div className="cart-info"><h3>{product.name}</h3><p>Qty: {quantity}</p></div>
            <p className="price">{formatPrice(product.price * quantity)}</p>
          </div>
        ))}
      </section>

      <aside className="panel buybox">
        <button className="btn btn-yellow btn-block" disabled={submitting}>
          {submitting ? 'Placing order…' : 'Place your order'}
        </button>
        {error && <p className="state error">{error}</p>}
        <h3>Order summary</h3>
        <p className="sum-row"><span>Items ({count}):</span><span>{formatPrice(subtotal)}</span></p>
        <p className="sum-row"><span>Shipping:</span><span>Free</span></p>
        <p className="sum-row total"><span>Order total:</span><span>{formatPrice(subtotal)}</span></p>
      </aside>
    </form>
  );
}
