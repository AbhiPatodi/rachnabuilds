'use client';

import { useState } from 'react';
import Link from 'next/link';
import '../tools/tools.css';

const CHALLENGES = [
  'Low conversion rate',
  'Slow site speed',
  'Poor mobile experience',
  'High cart abandonment',
  'Low organic traffic',
  'Poor product page performance',
  'Other',
];

const REVENUE_OPTIONS = [
  'Just starting out (< $1K/mo)',
  '$1K – $5K / month',
  '$5K – $20K / month',
  '$20K – $50K / month',
  '$50K+ / month',
];

export default function FreeAuditClient() {
  const [form, setForm] = useState({ name: '', email: '', storeUrl: '', revenue: '', challenge: '', details: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/free-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tool-page">
      {/* Nav spacer */}
      <div style={{ height: 72 }} />

      <div className="tool-hero">
        <div className="tool-tag">Free · No Obligation</div>
        <h1 className="tool-h1">Get Your Free Shopify<br />Store Audit</h1>
        <p className="tool-sub">
          I'll personally record a 15-minute Loom video reviewing your store and send you specific, actionable fixes.<br />
          No pitch. No sales call. Just real recommendations.
        </p>
      </div>

      {/* Benefits */}
      <div className="audit-benefits">
        <div className="audit-benefit">
          <div className="audit-benefit-icon">🎥</div>
          <div className="audit-benefit-title">Personal Loom Review</div>
          <div className="audit-benefit-desc">A recorded walkthrough of your actual store — not a generic report.</div>
        </div>
        <div className="audit-benefit">
          <div className="audit-benefit-icon">📋</div>
          <div className="audit-benefit-title">Specific Action Items</div>
          <div className="audit-benefit-desc">Prioritised list of exactly what to fix and why, based on your store.</div>
        </div>
        <div className="audit-benefit">
          <div className="audit-benefit-icon">⚡</div>
          <div className="audit-benefit-title">Speed + Conversion Check</div>
          <div className="audit-benefit-desc">PageSpeed score, CRO gaps, mobile UX issues — the full picture.</div>
        </div>
      </div>

      {/* Form or thank you */}
      <div className="tool-form-wrap">
        {done ? (
          <div className="audit-thankyou">
            <div className="audit-thankyou-icon">🎉</div>
            <h2>You're on the list!</h2>
            <p>
              I'll review your store and send your personal Loom audit within <strong>24–48 hours</strong>.
              Check your inbox at <strong>{form.email}</strong>.
            </p>
            <p style={{ marginTop: 12, fontSize: 14, opacity: 0.7 }}>
              While you wait — check your store's speed score:
            </p>
            <Link href="/tools/pagespeed" className="tool-cta-btn" style={{ marginTop: 12, display: 'inline-block' }}>
              Check My Store Speed →
            </Link>
          </div>
        ) : (
          <form className="audit-form" onSubmit={handleSubmit}>
            <h2 className="audit-form-title">Request Your Free Audit</h2>
            <p className="audit-form-sub">Takes 2 minutes. I personally review every submission.</p>

            <div className="tool-field-row">
              <div className="tool-field">
                <label>Your Name *</label>
                <input type="text" placeholder="Jane Smith" required value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="tool-field">
                <label>Email Address *</label>
                <input type="email" placeholder="jane@yourstore.com" required value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>

            <div className="tool-field">
              <label>Shopify Store URL *</label>
              <input type="url" placeholder="https://yourstore.com" required value={form.storeUrl} onChange={e => set('storeUrl', e.target.value)} />
            </div>

            <div className="tool-field">
              <label>Monthly Revenue</label>
              <select value={form.revenue} onChange={e => set('revenue', e.target.value)}>
                <option value="">Select range (optional)</option>
                {REVENUE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="tool-field">
              <label>Biggest Challenge Right Now</label>
              <div className="tool-chip-grid">
                {CHALLENGES.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`tool-chip${form.challenge === c ? ' selected' : ''}`}
                    onClick={() => set('challenge', c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="tool-field">
              <label>Anything else you'd like me to focus on? <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <textarea
                placeholder="e.g. My checkout page has a lot of drop-offs, or I just launched a new collection..."
                rows={3}
                value={form.details}
                onChange={e => set('details', e.target.value)}
              />
            </div>

            {error && <p className="tool-error">{error}</p>}

            <button type="submit" className="tool-submit-btn" disabled={loading}>
              {loading ? 'Submitting…' : 'Request My Free Audit →'}
            </button>

            <p className="tool-privacy">
              No spam. Your details are used only to send your audit.
            </p>
          </form>
        )}
      </div>

      {/* Social proof */}
      <div className="audit-proof">
        <p className="audit-proof-label">Trusted by Shopify store owners across</p>
        <div className="audit-proof-countries">🇮🇳 India &nbsp;·&nbsp; 🇬🇧 UK &nbsp;·&nbsp; 🇫🇷 France &nbsp;·&nbsp; 🇺🇸 USA &nbsp;·&nbsp; 🇦🇺 Australia</div>
      </div>

      <div style={{ textAlign: 'center', padding: '24px 0 64px' }}>
        <Link href="/tools" style={{ color: 'var(--text-muted)', fontSize: 14 }}>← Back to Free Tools</Link>
      </div>
    </div>
  );
}
