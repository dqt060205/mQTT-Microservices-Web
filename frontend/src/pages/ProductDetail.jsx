import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import ProductImage from '../components/ProductImage.jsx';
import AddToCartButton from '../components/AddToCartButton.jsx';
import { useAddToCart } from '../context/CartContext.jsx';
import { categoryOf, formatPrice, stars } from '../utils/format.js';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToCart = useAddToCart();
  const [product, setProduct] = useState(null);
  const [tutorials, setTutorials] = useState([]);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setProduct(null);
    setError('');
    setQty(1);
    api.getProduct(id).then((p) => alive && setProduct(p)).catch((e) => alive && setError(e.message));
    api.getTutorialsByProduct(id).then((t) => alive && setTutorials(t)).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  if (error) return <p className="state error">{error} <Link to="/">Back to products</Link></p>;
  if (!product) return <p className="state">Loading…</p>;

  const soldOut = product.stock != null && product.stock <= 0;
  const maxQty = Math.min(product.stock ?? 10, 10);

  const buyNow = async () => {
    try {
      if (await addToCart(product.id, qty)) navigate('/checkout');
    } catch (err) { alert(err.message); }
  };

  return (
    <>
      <p className="crumbs"><Link to="/">Products</Link> › <Link to={`/?category=${categoryOf(product)}`}>{categoryOf(product)}</Link></p>
      <div className="detail">
        <ProductImage product={product} size="lg" />

        <section className="detail-info">
          <h1>{product.name}</h1>
          {product.rating != null && (
            <p className="rating"><span>{stars(product.rating)}</span> {product.rating} · {product.reviewCount?.toLocaleString()} ratings</p>
          )}
          <hr />
          <p className="price price-lg">{formatPrice(product.price)}</p>
          <p>{product.description}</p>
          {product.bullets?.length > 0 && (
            <>
              <h3>About this item</h3>
              <ul>{product.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
            </>
          )}
        </section>

        <aside className="buybox">
          <p className="price price-lg">{formatPrice(product.price)}</p>
          {soldOut ? <p className="out">Currently unavailable</p> : <p className="instock">In stock</p>}
          {!soldOut && (
            <>
              <label className="qty">Quantity
                <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                  {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
              <AddToCartButton productId={product.id} quantity={qty} className="btn btn-yellow btn-block" />
              <button className="btn btn-orange btn-block" onClick={buyNow}>Buy Now</button>
            </>
          )}
        </aside>
      </div>

      {tutorials.length > 0 && (
        <section className="tutorials">
          <h2>Tutorials for this product</h2>
          <div className="tutorial-list">
            {tutorials.map((t) => (
              <article key={t.id} className="tutorial">
                <h3>{t.title}</h3>
                <p>{t.summary}</p>
                <small>{t.level} · {t.minutes} min</small>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
