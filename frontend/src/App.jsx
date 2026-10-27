import { useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import './index.css';

function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { customer, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (customer) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to connect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <Link className="brand" to="/">POLY<span>VAULT</span></Link>
        <div>
          <p className="eyebrow">THE CREATOR MARKETPLACE</p>
          <h1>Worlds worth<br />building.</h1>
          <p className="intro-copy">A home for the objects, places, and ideas that bring your next project to life.</p>
        </div>
        <p className="intro-foot">Discover your next building block <span>↗</span></p>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">{isRegister ? 'JOIN THE COMMUNITY' : 'WELCOME BACK'}</p>
          <h2>{isRegister ? 'Create your account' : 'Sign in to PolyVault'}</h2>
          <p className="muted">{isRegister ? 'Start exploring independent 3D work.' : 'Your next great project starts here.'}</p>
          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <label>Full name<input required maxLength="100" autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
                <label>Phone<input required type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
              </>
            )}
            <label>Email<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Password<input required type="password" minLength="8" autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary" disabled={submitting}>{submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} <span>→</span></button>
          </form>
          <p className="form-switch">{isRegister ? 'Already have an account?' : 'New to PolyVault?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
        </div>
      </section>
    </main>
  );
}

function ProfilePage() {
  const { customer, logout, becomeCreator } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to log out. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  async function enableCreator() {
    setBusy(true);
    setError('');
    try {
      await becomeCreator();
      setMessage('Creator access is enabled. Your creator tools will appear as they are added.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to enable creator access.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="profile-page">
      <nav className="topbar"><Link className="brand" to="/">POLY<span>VAULT</span></Link><button className="button button-quiet" onClick={handleLogout} disabled={busy}>Log out</button></nav>
      <section className="profile-card">
        <p className="eyebrow">YOUR POLYVAULT</p>
        <h1>Good to have you here, {customer.fullName.split(' ')[0]}.</h1>
        <p className="muted">Your account is ready. We’re building out the marketplace in tested increments.</p>
        <dl><div><dt>Email</dt><dd>{customer.email}</dd></div><div><dt>Account type</dt><dd>{customer.isCreator ? 'Buyer + Creator' : 'Buyer'}</dd></div></dl>
        {message && <p className="form-success" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!customer.isCreator && <button className="button button-primary" onClick={enableCreator} disabled={busy}>Become a creator <span>→</span></button>}
        {customer.isCreator && <p className="creator-badge">CREATOR ACCESS ENABLED</p>}
      </section>
    </main>
  );
}

export default function App() {
  const { loading, sessionError, refreshSession } = useAuth();
  const [retrying, setRetrying] = useState(false);
  if (loading) return <main className="page-state">Loading PolyVault…</main>;
  if (sessionError) {
    return (
      <main className="page-state">
        <section className="session-error">
          <p className="eyebrow">CONNECTION ISSUE</p>
          <h1>We couldn’t restore your session.</h1>
          <p className="muted">{sessionError}</p>
          <button
            className="button button-primary"
            disabled={retrying}
            onClick={async () => {
              setRetrying(true);
              try {
                await refreshSession();
              } catch {
                // The context keeps the retryable session error visible.
              } finally {
                setRetrying(false);
              }
            }}
          >
            {retrying ? 'Retrying…' : 'Try again'}
          </button>
        </section>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
