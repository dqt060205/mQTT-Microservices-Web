import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { CATEGORIES } from '../utils/format.js';
import { isMock } from '../api';

export default function Header() {
  const { user, signOut } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || '');

  useEffect(() => {
    setQ(params.get('q') || '');
    setCategory(params.get('category') || '');
  }, [params]);

  const search = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    if (category) next.set('category', category);
    navigate(`/?${next}`);
  };

  return (
    <header>
      <div className="topbar">
        <Link to="/" className="logo" aria-label="mQTT home">mQTT<span>.iot</span></Link>

        <form className="search" onSubmit={search} role="search">
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search boards, sensors, modules" aria-label="Search products" />
          <button type="submit" aria-label="Search">🔍</button>
        </form>

        {user ? (
          <div className="navitem">
            <small>Hello, {user.name?.split(' ')[0] || 'there'}</small>
            <button className="linkbtn" onClick={() => { signOut(); navigate('/'); }}>Sign out</button>
          </div>
        ) : (
          <Link to="/login" className="navitem"><small>Hello, sign in</small><b>Account</b></Link>
        )}
        <Link to="/orders" className="navitem"><small>Returns</small><b>& Orders</b></Link>
        <Link to="/cart" className="cartlink" aria-label={`Cart, ${count} items`}>
          <span className="cartcount">{count}</span> 🛒 <b>Cart</b>
        </Link>
      </div>

      <nav className="subnav">
        <Link to="/">All products</Link>
        {CATEGORIES.map((c) => <Link key={c} to={`/?category=${c}`}>{c}</Link>)}
        {isMock && <span className="mockflag">Demo data</span>}
      </nav>
    </header>
  );
}
