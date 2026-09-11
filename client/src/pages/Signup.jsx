import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { AuthBrand, AuthIllustration } from '../components/AuthShell';
import { roleHome } from '../roles';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', address: '', role: 'customer'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const user = await signup({
        ...form,
        role: 'customer',
        email: form.email.trim().toLowerCase()
      });
      setSuccess('Account created! Signing you in…');
      setTimeout(() => navigate(user.home || roleHome(user.role)), 500);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="login-page auth-static">
      <div className="login-left">
        <AuthBrand />
        <div className="login-hero">
          <h1 className="login-tagline">Smart returns.<br />Safer commerce.</h1>
          <p className="login-desc">Create a customer account to place returns. Staff roles are managed by Admin.</p>
          <AuthIllustration />
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrapper auth-compact">
          <Link to="/" className="auth-back-home">← Back to home</Link>
          <div className="auth-tabs">
            <button type="button" className="auth-tab" onClick={() => navigate('/login')}>Sign In</button>
            <button type="button" className="auth-tab active">Sign Up</button>
          </div>
          <h2>Create customer account</h2>
          <p className="login-subtitle">Service Agent, Fraud Analyst &amp; Admin are seeded / admin-managed</p>

          <form className="login-form" onSubmit={onSubmit} autoComplete="off">
            <div className="form-group">
              <label htmlFor="signup-name">Full name <span className="req">*</span></label>
              <input id="signup-name" type="text" placeholder="Your full name" value={form.name} onChange={(e) => set('name', e.target.value)} required minLength={2} />
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="signup-email">Email <span className="req">*</span></label>
                <input id="signup-email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="signup-phone">Phone <span className="req">*</span></label>
                <input id="signup-phone" type="text" placeholder="10-digit mobile" value={form.phone} onChange={(e) => set('phone', e.target.value)} required pattern="[0-9]{10}" title="10 digit phone number" />
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="signup-password">Password <span className="req">*</span></label>
                <input id="signup-password" type="password" placeholder="Min 6 characters" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} />
              </div>
              <div className="form-group">
                <label htmlFor="signup-address">Address <span className="req">*</span></label>
                <input id="signup-address" type="text" placeholder="Delivery / pickup address" value={form.address} onChange={(e) => set('address', e.target.value)} required />
              </div>
            </div>
            <p className="field-hint">Role is fixed to Customer. Use Sign In demo chips for Agent / Fraud / Admin.</p>

            {error ? <div className="login-error">{error}</div> : null}
            {success ? <div className="login-success">{success}</div> : null}
            <button type="submit" className="btn-primary login-btn" disabled={busy}>
              {busy ? 'Creating…' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
