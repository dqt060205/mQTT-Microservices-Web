import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import ProductCard from '../components/ProductCard.jsx';
import { CATEGORIES } from '../utils/format.js';

export default function Home() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setProducts(null);
    setError('');
    api.listProducts({ q, category })
      .then((list) => alive && setProducts(list))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [q, category]);

  const browsing = q || category;

  return (
    <>
      {!browsing && (
        <>
          <section className="hero">
            <h1>Everything you need to build a connected device</h1>
            <p>Boards, sensors and radios, each with step-by-step tutorials.</p>
            <Link to="/?category=Boards" className="btn btn-orange">Shop development boards</Link>
          </section>
          <section className="tiles" aria-label="Shop by category">
            {CATEGORIES.map((c) => (
              <Link key={c} to={`/?category=${c}`} className={`tile cat-${c}`}>{c}</Link>
            ))}
          </section>
        </>
      )}

      <h2 className="section-title">
        {browsing
          ? `${products ? products.length : '…'} results${q ? ` for "${q}"` : ''}${category ? ` in ${category}` : ''}`
          : 'Popular right now'}
      </h2>

      {error && <p className="state error">{error}</p>}
      {!error && !products && <p className="state">Loading products…</p>}
      {products && products.length === 0 && (
        <p className="state">No products match your search. Try a different keyword or <Link to="/">browse everything</Link>.</p>
      )}
      <div className="grid">
        {products?.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </>
  );
}
