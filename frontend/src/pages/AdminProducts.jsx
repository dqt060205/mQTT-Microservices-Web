import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import ProductImage from '../../components/ProductImage.jsx';
import Pagination from '../../components/Pagination.jsx';
import { categoryOf, formatPrice } from '../../utils/format.js';

const PAGE_SIZE = 10;

export default function AdminProducts() {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState(''); // applied search
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setResult(await api.searchProducts({ q: term, page, limit: PAGE_SIZE, sort: 'newest' }));
    } catch (e) { setError(e.message); }
  }, [term, page]);

  useEffect(() => { load(); }, [load]);

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setBusyId(p.id);
    setError('');
    try {
      await api.deleteProduct(p.id);
      // deleted the last row of a later page: step back one page
      if (result.items.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (e) { setError(e.message); }
    setBusyId(null);
  };

  const search = (e) => { e.preventDefault(); setPage(1); setTerm(q.trim()); };

  return (
    <div className="admin">
      <div className="admin-head">
        <h1>Manage products</h1>
        <Link to="/admin/products/new" className="btn btn-yellow">+ Add product</Link>
      </div>

      <form className="admin-search" onSubmit={search} role="search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, SKU or description" aria-label="Search products" />
        <button className="btn btn-light">Search</button>
      </form>

      {error && <p className="state error">{error}</p>}
      {!result && !error && <p className="state">Loading products…</p>}
      {result && result.items.length === 0 && <p className="state">No products found.</p>}

      {result && result.items.length > 0 && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th></th><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th></th></tr>
            </thead>
            <tbody>
              {result.items.map((p) => (
                <tr key={p.id}>
                  <td><ProductImage product={p} size="xs" /></td>
                  <td><b>{p.name}</b><br /><small>{p.sku || '—'}</small></td>
                  <td>{categoryOf(p) || '—'}</td>
                  <td className="num">{formatPrice(p.price)}</td>
                  <td className="num">{p.stock <= 0 ? <span className="out">Out</span> : p.stock}</td>
                  <td className="row-actions">
                    <Link to={`/admin/products/${p.id}/edit`}>Edit</Link>
                    <button className="linkbtn danger" disabled={busyId === p.id} onClick={() => remove(p)}>
                      {busyId === p.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && <Pagination {...result.pagination} onPage={setPage} />}
    </div>
  );
}