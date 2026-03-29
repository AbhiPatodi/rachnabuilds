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

export default function NewReportPage() {
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [slug, setSlug] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [password, setPassword] = useState(() => generatePassword(''));
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(toSlug(clientName));
    }
  }, [clientName, slugManuallyEdited]);

  const handleSlugChange = (val: string) => {
    setSlug(val);
    setSlugManuallyEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, slug, clientEmail, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create report');
        return;
      }
      const data = await res.json();
      // Save password so Share modal pre-fills it
      localStorage.setItem(`share_pw_${slug}`, password);
      router.push(`/admin/reports/${data.id}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-content" style={{ maxWidth: 640 }}>
      <div className="admin-breadcrumb">
        <Link href="/admin/dashboard">Dashboard</Link>
        <span>/</span>
        <span className="current">New Report</span>
      </div>

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">New Client Report</h1>
          <p className="admin-page-subtitle">Create a password-protected portal for your client</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-card">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-row">
            <div className="admin-field">
              <label className="admin-label" htmlFor="clientName">Client Name *</label>
              <input
                id="clientName"
                type="text"
                className="admin-input"
                placeholder="e.g. Acme Stores"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                required
              />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="clientEmail">Client Email</label>
              <input
                id="clientEmail"
                type="email"
                className="admin-input"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="slug">Slug (URL) *</label>
            <input
              id="slug"
              type="text"
              className="admin-input"
              placeholder="acme-stores"
              value={slug}
              onChange={e => handleSlugChange(e.target.value)}
              required
            />
            <div className="admin-slug-hint">
              Portal URL: rachnabuilds.com/reports/{slug || 'your-slug'}
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
                onClick={() => setPassword(generatePassword(clientName))}
                title="Generate new password"
                style={{ flexShrink: 0, fontSize: 12 }}
              >
                ↻ Regenerate
              </button>
            </div>
            <div className="admin-slug-hint">
              Client will use this to log into their portal — it will be copied to your clipboard when you share.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={loading}
              style={{ padding: '12px 28px', fontSize: '14px' }}
            >
              {loading ? 'Creating...' : 'Create Report →'}
            </button>
            <Link href="/admin/dashboard" className="admin-btn admin-btn-ghost" style={{ padding: '12px 20px', fontSize: '14px' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
