'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generatePassword(name: string) {
  const prefix = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'client';
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}${suffix}`;
}

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState(() => generatePassword(''));
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(toSlug(name));
    }
  }, [name, slugManuallyEdited]);

  const handleSlugChange = (val: string) => {
    setSlug(val);
    setSlugManuallyEdited(true);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, slug, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create client');
        return;
      }
      const data = await res.json();
      router.push(`/admin/clients/${data.id}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-content" style={{ maxWidth: 680 }}>
      <div className="admin-breadcrumb">
        <Link href="/admin/dashboard">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/clients">Clients</Link>
        <span>/</span>
        <span className="current">New Client</span>
      </div>

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">New Client</h1>
          <p className="admin-page-subtitle">Create a client portal with password-protected access</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-card">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-row">
            <div className="admin-field">
              <label className="admin-label" htmlFor="name">Client Name *</label>
              <input
                id="name"
                type="text"
                className="admin-input"
                placeholder="e.g. Sage & Veda"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="admin-input"
                placeholder="client@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-field">
              <label className="admin-label" htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="text"
                className="admin-input"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="slug">Portal Slug (URL) *</label>
              <input
                id="slug"
                type="text"
                className="admin-input"
                placeholder="sage-and-veda"
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                required
              />
              <div className="admin-slug-hint">
                rachnabuilds.com/portal/{slug || 'your-slug'}
              </div>
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="password">Portal Password *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="password"
                type="text"
                className="admin-input"
                placeholder="Auto-generated"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px' }}
              />
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={copyPassword}
                style={{ flexShrink: 0, fontSize: 12 }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setPassword(generatePassword(name))}
                style={{ flexShrink: 0, fontSize: 12 }}
              >
                ↻ New
              </button>
            </div>
            <div className="admin-slug-hint">
              Client uses this to log into their portal. Copy it before submitting.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={loading}
              style={{ padding: '12px 28px', fontSize: '14px' }}
            >
              {loading ? 'Creating…' : 'Create Client →'}
            </button>
            <Link href="/admin/clients" className="admin-btn admin-btn-ghost" style={{ padding: '12px 20px', fontSize: '14px' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
