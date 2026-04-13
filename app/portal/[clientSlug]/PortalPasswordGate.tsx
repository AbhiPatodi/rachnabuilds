'use client';

import { useState, useEffect, FormEvent } from 'react';
import '../../reports/[slug]/portal.css';

const LogoSVG = () => (
  <svg viewBox="0 0 64 72" fill="none" width="40" height="45">
    <rect width="11" height="72" fill="currentColor" />
    <rect width="42" height="11" fill="currentColor" />
    <path d="M42 0Q64 0 64 16Q64 32 42 32" stroke="currentColor" strokeWidth="11" fill="none" />
    <rect y="27" width="38" height="11" fill="currentColor" />
    <path d="M36 38L64 72" stroke="currentColor" strokeWidth="11" strokeLinecap="square" />
  </svg>
);

interface PortalPasswordGateProps {
  clientSlug: string;
  clientName: string;
}

export default function PortalPasswordGate({ clientSlug, clientName }: PortalPasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rb_theme');
      const h = new Date().getHours();
      const auto = h >= 6 && h < 20 ? 'light' : 'dark';
      const theme = stored === 'light' || stored === 'dark' ? stored : auto;
      document.documentElement.setAttribute('data-theme', theme);
    } catch {}
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/portal/${clientSlug}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.reload();
      } else if (res.status === 403) {
        setError('This portal has been deactivated. Please contact Rachna for assistance.');
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gate-root">
      <div className="gate-card">
        <div className="gate-logo">
          <LogoSVG />
        </div>
        <div className="gate-brand">
          Rachna <span className="gate-brand-italic">Builds</span>
        </div>
        <h1 className="gate-heading">Welcome, {clientName}</h1>
        <p className="gate-subtitle">Enter your access password to view your portal.</p>
        <form onSubmit={handleSubmit} className="gate-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            className="gate-input"
          />
          {error && <p className="gate-error">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="gate-btn"
          >
            {loading ? 'Verifying...' : 'View My Portal →'}
          </button>
        </form>
        <p className="gate-footer">This portal is private and prepared exclusively for you.</p>
      </div>
    </div>
  );
}
