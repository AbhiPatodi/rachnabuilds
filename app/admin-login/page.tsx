'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../admin/admin.css';

const LogoSVG = () => (
  <svg viewBox="0 0 64 72" fill="none" width="32" height="36">
    <rect width="11" height="72" fill="currentColor"/>
    <rect width="42" height="11" fill="currentColor"/>
    <path d="M42 0Q64 0 64 16Q64 32 42 32" stroke="currentColor" strokeWidth="11" fill="none"/>
    <rect y="27" width="38" height="11" fill="currentColor"/>
    <path d="M36 38L64 72" stroke="currentColor" strokeWidth="11" strokeLinecap="square"/>
  </svg>
);

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/admin/dashboard');
      } else {
        setError('Incorrect password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <span style={{ color: 'var(--accent)' }}>
            <LogoSVG />
          </span>
          <div className="admin-login-logo-text">
            <div className="brand">Rachna Builds</div>
            <div className="subtitle">Client Portal</div>
          </div>
        </div>

        <h1 className="admin-login-heading">Admin Access</h1>
        <p className="admin-login-sub">Rachna Builds Client Portal</p>

        {error && (
          <div className="admin-alert admin-alert-error">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-field">
            <label className="admin-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="admin-input"
              placeholder="Enter admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: '15px', borderRadius: '12px', marginTop: '8px' }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
}
