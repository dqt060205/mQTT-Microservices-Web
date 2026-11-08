import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

const EMPTY = { name: '', sku: '', description: '', price: '', stock: '0', imageUrl: '', categoryId: '' };

// Create (/admin/products/new) and edit (/admin/products/:id/edit) share this form.
export default function AdminProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.listCategories().then((c) => alive && setCategories(c)).catch(() => {});
    if (editing) {
      api.getProduct(id)
        .then((p) => alive && setForm({
          name: p.name ?? '',
          sku: p.sku ?? '',
          description: p.description ?? '',
          price: String(p.price ?? ''),
          stock: String(p.stock ?? 0),
          imageUrl: p.imageUrl ?? '',
          categoryId: p.categoryId ?? p.category?.id ?? (typeof p.category === 'string' ? p.category : ''),
        }))
        .catch((e) => alive && setError(e.message))
        .finally(() => alive && setLoading(false));
    }
    return () => { alive = false; };
  }, [id, editing]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) await api.updateProduct(id, form);
      else await api.createProduct(form);
      navigate('/admin/products', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (loading) return <p className="state">Loading…</p>;

  return (
    <form className="panel admin-form" onSubmit={submit}>
      <p className="crumbs"><Link to="/admin/products">Manage products</Link> › {editing ? 'Edit' : 'New'}</p>
      <h1>{editing ? 'Edit product' : 'Add product'}</h1>
      {error && <p className="state error">{error}</p>}

      <label className="field">Name
        <input value={form.name} onChange={set('name')} required maxLength={180} />
      </label>

      <div className="field-row">
        <label className="field">SKU
          <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
            required maxLength={80} pattern="[A-Z0-9][A-Z0-9._\-]*" title="Capital letters, numbers, . _ and -" placeholder="MQTT-ESP32-001" />
        </label>
        <label className="field">Category
          <select value={form.categoryId} onChange={set('categoryId')}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">Price
          <input type="number" min="0.01" step="0.01" value={form.price} onChange={set('price')} required />
        </label>
        <label className="field">Stock
          <input type="number" min="0" step="1" value={form.stock} onChange={set('stock')} required />
        </label>
      </div>

      <label className="field">Image URL <small>(optional)</small>
        <input type="url" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" maxLength={2048} />
      </label>

      <label className="field">Description <small>(optional)</small>
        <textarea rows={5} value={form.description} onChange={set('description')} maxLength={5000} />
      </label>

      <div className="form-actions">
        <button className="btn btn-yellow" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button>
        <Link to="/admin/products" className="btn btn-light">Cancel</Link>
      </div>
    </form>
  );
}