'use client';

import { useState } from 'react';
import Link from 'next/link';

const CLIENT_TYPES = [
  { value: 'new_build',             label: 'New Build',              desc: 'Brand new website from scratch' },
  { value: 'existing_optimisation', label: 'Optimisation',           desc: 'Improve an existing site' },
  { value: 'audit_only',            label: 'Audit / Review',         desc: 'Detailed report & action plan' },
  { value: 'landing_page',          label: 'Landing Page',           desc: 'Single high-converting page' },
  { value: 'retainer',              label: 'Monthly Retainer',       desc: 'Ongoing support & updates' },
  { value: 'migration',             label: 'Platform Migration',     desc: 'Move to a new platform' },
];

const PLATFORMS = [
  { value: 'shopify',     label: 'Shopify' },
  { value: 'wordpress',   label: 'WordPress' },
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'webflow',     label: 'Webflow' },
  { value: 'custom',      label: 'Custom / Other' },
];

const NEEDS_PLATFORM = ['new_build', 'existing_optimisation', 'landing_page', 'migration', 'retainer'];

export default function StartPage() {
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    website: '',
    clientType: '',
    platform: '',
    message: '',
  });

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
    if (key === 'clientType') setForm(f => ({ ...f, clientType: val, platform: '' }));
  }

  const showPlatform = NEEDS_PLATFORM.includes(form.clientType);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.clientType) {
      setError('Please fill in your name, email, and what you need.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      setStep('done');
    } catch {
      setError('Could not submit. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        .start-wrap { min-height: 100vh; background: #0B0F1A; color: #E2E8F0; font-family: 'DM Sans', 'Inter', sans-serif; }
        .start-nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 40px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .start-logo { font-weight: 800; font-size: 18px; color: #06D6A0; text-decoration: none; letter-spacing: -.02em; }
        .start-nav-back { font-size: 13px; color: #64748B; text-decoration: none; }
        .start-nav-back:hover { color: #06D6A0; }
        .start-body { max-width: 640px; margin: 0 auto; padding: 60px 24px 80px; }
        .start-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #06D6A0; margin-bottom: 14px; }
        .start-title { font-size: 36px; font-weight: 800; line-height: 1.15; color: #F1F5F9; margin-bottom: 12px; letter-spacing: -.03em; }
        .start-sub { font-size: 15px; color: #64748B; line-height: 1.65; margin-bottom: 44px; }
        .start-label { display: block; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #94A3B8; margin-bottom: 8px; }
        .start-input { width: 100%; background: #131827; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 16px; font-size: 14px; color: #E2E8F0; outline: none; box-sizing: border-box; transition: border-color .15s; }
        .start-input:focus { border-color: #06D6A0; }
        .start-input::placeholder { color: #3D4A5C; }
        .start-row { margin-bottom: 22px; }
        .start-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
        @media (max-width: 500px) { .start-row-2 { grid-template-columns: 1fr; } }
        .start-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 22px; }
        @media (max-width: 500px) { .start-type-grid { grid-template-columns: 1fr; } }
        .start-type-btn { background: #131827; border: 1.5px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px 16px; text-align: left; cursor: pointer; transition: all .15s; }
        .start-type-btn:hover { border-color: rgba(6,214,160,0.4); }
        .start-type-btn.selected { border-color: #06D6A0; background: rgba(6,214,160,0.07); }
        .start-type-name { font-size: 13px; font-weight: 700; color: #E2E8F0; margin-bottom: 3px; }
        .start-type-desc { font-size: 11px; color: #64748B; }
        .start-platform-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
        .start-platform-btn { background: #131827; border: 1.5px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 600; color: #94A3B8; cursor: pointer; transition: all .15s; }
        .start-platform-btn:hover { border-color: rgba(6,214,160,0.4); color: #E2E8F0; }
        .start-platform-btn.selected { border-color: #06D6A0; background: rgba(6,214,160,0.07); color: #06D6A0; }
        .start-textarea { resize: vertical; min-height: 100px; }
        .start-error { background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.25); border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #FF6B6B; margin-bottom: 20px; }
        .start-submit { width: 100%; padding: 15px; background: #06D6A0; color: #0B0F1A; border: none; border-radius: 10px; font-size: 15px; font-weight: 800; cursor: pointer; letter-spacing: -.01em; transition: opacity .15s; }
        .start-submit:hover:not(:disabled) { opacity: .88; }
        .start-submit:disabled { opacity: .5; cursor: not-allowed; }
        .start-note { font-size: 12px; color: #3D4A5C; text-align: center; margin-top: 16px; }
        /* Done state */
        .start-done { text-align: center; padding: 80px 24px; }
        .start-done-icon { font-size: 56px; margin-bottom: 24px; }
        .start-done-title { font-size: 28px; font-weight: 800; color: #06D6A0; margin-bottom: 12px; letter-spacing: -.02em; }
        .start-done-sub { font-size: 15px; color: #64748B; line-height: 1.65; max-width: 440px; margin: 0 auto 32px; }
        .start-done-btn { display: inline-block; padding: 12px 28px; border-radius: 8px; border: 1.5px solid rgba(6,214,160,0.3); color: #06D6A0; font-size: 13px; font-weight: 700; text-decoration: none; }
      `}</style>

      <div className="start-wrap">
        <nav className="start-nav">
          <Link href="/" className="start-logo">RB</Link>
          <Link href="/" className="start-nav-back">← Back to site</Link>
        </nav>

        <div className="start-body">
          {step === 'done' ? (
            <div className="start-done">
              <div className="start-done-icon">✅</div>
              <div className="start-done-title">Brief received!</div>
              <div className="start-done-sub">
                Thanks for reaching out. Rachna will review your brief and get back to you within 24 hours with next steps and your client portal access.
              </div>
              <Link href="/" className="start-done-btn">← Back to rachnabuilds.com</Link>
            </div>
          ) : (
            <>
              <div className="start-eyebrow">Get Started</div>
              <h1 className="start-title">Tell me about your project</h1>
              <p className="start-sub">
                Fill in the brief below. I&apos;ll review it and send you portal access within 24 hours.
              </p>

              <form onSubmit={handleSubmit}>
                {/* Name + Email */}
                <div className="start-row-2">
                  <div>
                    <label className="start-label">Your Name *</label>
                    <input className="start-input" placeholder="Priya Sharma" value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div>
                    <label className="start-label">Email *</label>
                    <input className="start-input" type="email" placeholder="priya@brand.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                </div>

                {/* Phone + Business */}
                <div className="start-row-2">
                  <div>
                    <label className="start-label">Phone (optional)</label>
                    <input className="start-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="start-label">Business / Brand Name</label>
                    <input className="start-input" placeholder="Sage & Veda" value={form.businessName} onChange={e => set('businessName', e.target.value)} />
                  </div>
                </div>

                {/* Website */}
                <div className="start-row">
                  <label className="start-label">Current Website (if any)</label>
                  <input className="start-input" placeholder="https://yourbrand.com" value={form.website} onChange={e => set('website', e.target.value)} />
                </div>

                {/* What do you need */}
                <div className="start-row">
                  <label className="start-label">What do you need? *</label>
                  <div className="start-type-grid">
                    {CLIENT_TYPES.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        className={`start-type-btn${form.clientType === t.value ? ' selected' : ''}`}
                        onClick={() => set('clientType', t.value)}
                      >
                        <div className="start-type-name">{t.label}</div>
                        <div className="start-type-desc">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform (conditional) */}
                {showPlatform && (
                  <div className="start-row">
                    <label className="start-label">Platform</label>
                    <div className="start-platform-grid">
                      {PLATFORMS.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          className={`start-platform-btn${form.platform === p.value ? ' selected' : ''}`}
                          onClick={() => set('platform', p.value)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div className="start-row">
                  <label className="start-label">Anything else? (optional)</label>
                  <textarea
                    className="start-input start-textarea"
                    placeholder="Tell me about your brand, goals, timeline, or budget range..."
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                  />
                </div>

                {error && <div className="start-error">{error}</div>}

                <button type="submit" className="start-submit" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send My Brief →'}
                </button>
                <p className="start-note">No spam. No sales calls. Just a focused conversation about your project.</p>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
