import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api';
import ProductImage from '../components/ProductImage.jsx';
import { formatDate, formatPrice } from '../utils/format.js';

const CANCELLABLE = ['PENDING', 'PAYMENT_FAILED', 'PAID'];
const LABEL = {
  PENDING: 'Pending', PAID: 'Paid', PAYMENT_FAILED: 'Payment failed',
  CANCELLED: 'Cancelled', SHIPPED: 'Shipped', DELIVERED: 'Delivered',
};

export default function Orders() {
  const { state } = useLocation();
  const placed = state?.placed;
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listOrders().then(setOrders).catch((e) => setError(e.message));
  }, []);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    setError('');
    try {
      const updated = await api.cancelOrder(id);
      setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...updated } : o)));
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="orders">
      <h1>Your Orders</h1>

      {placed?.status === 'PAID' && (
        <p className="state success">Order placed, thank you! Order #{placed.id.slice(0, 8)} is paid.</p>
      )}
      {placed && placed.status !== 'PAID' && (
        <p className="state error">
          Your order was saved but the payment did not go through. You can cancel it below and try again.
        </p>
      )}
      {error && <p className="state error">{error}</p>}
      {!orders && !error && <p className="state">Loading orders…</p>}
      {orders?.length === 0 && (
        <div className="panel center"><p>You have not placed any orders yet.</p><Link to="/" className="btn btn-yellow">Start shopping</Link></div>
      )}

      {orders?.map((o) => (
        <section key={o.id} className="order">
          <header className="order-head">
            <div><small>Order placed</small><b>{formatDate(o.createdAt)}</b></div>
            <div><small>Total</small><b>{formatPrice(o.totalAmount)}</b></div>
            <div><small>Ship to</small><b>{o.shippingName}</b></div>
            <div className="order-id"><small>Order # {o.id.slice(0, 8)}</small><span className={`badge badge-${o.status}`}>{LABEL[o.status] || o.status}</span></div>
          </header>
          <div className="order-body">
            {o.items.map((i) => (
              <div key={i.id} className="cart-row">
                <ProductImage product={{ name: i.productName, imageUrl: i.imageUrl }} size="sm" />
                <div className="cart-info">
                  <Link to={`/products/${i.productId}`}><h3>{i.productName}</h3></Link>
                  <p>Qty: {i.quantity} · {formatPrice(i.unitPrice)} each</p>
                </div>
              </div>
            ))}
            {CANCELLABLE.includes(o.status) && (
              <button className="btn btn-light" onClick={() => cancel(o.id)}>Cancel order</button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
