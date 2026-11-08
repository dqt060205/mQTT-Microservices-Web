import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import ProductCard from '../components/ProductCard.jsx';
import ProductFilters from '../components/ProductFilters.jsx';
import Pagination from '../components/Pagination.jsx';
import { CATEGORIES } from '../utils/format.js';

const PAGE_SIZE = 8;
const toNum = (v) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);

export default function Home() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';
  const minPrice = toNum(params.get('min'));
  const maxPrice = toNum(params.get('max'));
  const inStock = params.get('stock') === '1';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);

  const [result, setResult] = useState(null); // { items, pagination }
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setResult(null);
    setError('');
    api.searchProducts({ q, category, sort, minPrice, maxPrice, inStock, page, limit: PAGE_SIZE })
      .then((r) => alive && setResult(r))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [q, category, sort, minPrice, maxPrice, inStock, page]);

  // Changing any filter goes back to page 1 unless the change is the page itself.
  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value == null) next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const goToPage = (n) => { update({ page: n > 1 ? n : '' }); window.scrollTo({ top: 0 }); };
  const clearFilters = () => update({ sort: '', min: '', max: '', stock: '' });

  const filtersActive = sort !== 'newest' || minPrice !== undefined || maxPrice !== undefined || inStock;
  const browsing = q || category || filtersActive || page > 1;
  const total = result?.pagination.total;

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
          ? `${total ?? '…'} results${q ? ` for "${q}"` : ''}${category ? ` in ${category}` : ''}`
          : 'Popular right now'}
      </h2>

      <ProductFilters
        sort={sort} min={minPrice} max={maxPrice} inStock={inStock}
        active={filtersActive} onChange={update} onClear={clearFilters}
      />

      {error && <p className="state error">{error}</p>}
      {!error && !result && <p className="state">Loading products…</p>}
      {result && result.items.length === 0 && (
        <p className="state">No products match your search. Try a different keyword or <Link to="/">browse everything</Link>.</p>
      )}
      <div className="grid">
        {result?.items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {result && <Pagination {...result.pagination} onPage={goToPage} />}
    </>
  );
}