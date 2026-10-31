import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isMock } from '../api';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || '/';
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') await signIn(form.email, form.password);
      else await signUp(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const creating = mode === 'signup';

  return (
    <div className="auth">
      <Link to="/" className="logo logo-dark">mQTT<span>.iot</span></Link>
      <form className="panel" onSubmit={submit}>
        <h1>{creating ? 'Create account' : 'Sign in'}</h1>
        {error && <p className="state error">{error}</p>}
        {creating && (
          <label className="field">Your name
            <input value={form.name} onChange={set('name')} required autoComplete="name" />
          </label>
        )}
        <label className="field">Email
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label className="field">Password
          <input type="password" value={form.password} onChange={set('password')} required minLength={creating ? 8 : 1} autoComplete={creating ? 'new-password' : 'current-password'} />
          {creating && <small>At least 8 characters</small>}
        </label>
        <button className="btn btn-yellow btn-block" disabled={busy}>{busy ? 'Please wait…' : creating ? 'Create your account' : 'Sign in'}</button>
        {isMock && !creating && <p className="hint">Demo account: demo@mqtt.dev / demo1234</p>}
      </form>
      <button className="btn btn-light auth-switch" onClick={() => { setMode(creating ? 'signin' : 'signup'); setError(''); }}>
        {creating ? 'Already have an account? Sign in' : 'New to mQTT? Create your account'}
      </button>
    </div>
  );
}
