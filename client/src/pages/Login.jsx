import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { AuthBrand, AuthIllustration } from '../components/AuthShell';
import { roleHome } from '../roles';

const DEMOS = [
  { email: 'customer@demo.com', password: 'demo123', role: 'customer', label: 'Customer' },
  { email: 'agent@demo.com', password: 'demo123', role: 'service_agent', label: 'Service Agent' },
  { email: 'fraud@demo.com', password: 'demo123', role: 'fraud_analyst', label: 'Fraud Analyst' },
  { email: 'admin@demo.com', password: 'admin123', role: 'admin', label: 'Admin (seeded)' }
];

const ROLES = [
  { value: 'customer', label: 'Customer' },
  { value: 'service_agent', label: 'Service Agent' },
  { value: 'fraud_analyst', label: 'Fraud Analyst' },
  { value: 'admin', label: 'Admin' }
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email.trim().toLowerCase(), password, role);
      navigate(user.home || roleHome(user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page auth-static">
      <div className="login-left">
        <AuthBrand />
        <div className="login-hero">
          <h1 className="login-tagline">Smart returns.<br />Safer commerce.</h1>
          <p className="login-desc">AI-powered return risk assessment for safer online retail.</p>
          <AuthIllustration />
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrapper auth-compact">
          <Link to="/" className="auth-back-home">← Back to home</Link>
          <div className="auth-tabs">
            <button type="button" className="auth-tab active">Sign In</button>
            <button type="button" className="auth-tab" onClick={() => navigate('/signup')}>Sign Up</button>
          </div>
          <h2>Welcome back</h2>
          <p className="login-subtitle">Sign in to your ReturnShield account</p>

          <form className="login-form" onSubmit={onSubmit} autoComplete="off">
            <div className="form-group">
              <label htmlFor="login-email">Email <span className="req">*</span></label>
              <input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Password <span className="req">*</span></label>
              <input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Role <span className="req">*</span></label>
              <div className="role-selector role-selector-4">
                {ROLES.map((r) => (
                  <label key={r.value} className="role-option">
                    <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} />
                    <span className="role-label">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {error ? <div className="login-error">{error}</div> : null}
            <button type="submit" className="btn-primary login-btn" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="demo-credentials">
            <p className="demo-title">Demo Accounts — click to fill</p>
            {DEMOS.map((d) => (
              <div
                key={d.email}
                className="demo-row"
                onClick={() => { setEmail(d.email); setPassword(d.password); setRole(d.role); }}
              >
                <span><strong>{d.label}</strong> — {d.email} / {d.password}</span>
              </div>
            ))}
            <p className="demo-note">Staff &amp; Admin are seeded. Customers can also Sign Up.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
