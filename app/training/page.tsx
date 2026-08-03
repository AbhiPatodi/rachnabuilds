'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function getUtms() {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const utms = {
    utmSource: p.get('utm_source') || undefined,
    utmMedium: p.get('utm_medium') || undefined,
    utmCampaign: p.get('utm_campaign') || undefined,
    utmContent: p.get('utm_content') || undefined,
  };
  try {
    const existing = JSON.parse(sessionStorage.getItem('fn_utms') || '{}');
    const merged = { ...existing, ...Object.fromEntries(Object.entries(utms).filter(([, v]) => v)) };
    sessionStorage.setItem('fn_utms', JSON.stringify(merged));
    return merged;
  } catch {
    return utms;
  }
}

export default function TrainingLanding() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', profession: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getUtms(); }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const utms = getUtms();
      const res = await fetch('/api/funnel/optin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...utms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      try {
        sessionStorage.setItem('fn_lead', JSON.stringify({ name: form.name, email: form.email, phone: form.phone }));
      } catch {}
      router.push('/training/watch');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fn-hero">
        <div className="fn-hero-inner">
          <div className="fn-callout">DTC E-commerce Brands · $5K–$50K/month in revenue</div>

          <h1 className="fn-h1">
            Increase Your Shopify Store&apos;s Conversion Rate to <em>2%+ Consistently</em> Every
            Month in Just 90 Days
          </h1>

          <p className="fn-sub">
            Free training for founder-led DTC brands already investing in paid traffic.
          </p>
        </div>
      </div>

      <div className="fn-body fn-body-raised">
      <div className="fn-card">
        <h2 className="fn-card-title">Enter your details to unlock your next steps</h2>
        <form onSubmit={submit}>
          <div className="fn-field">
            <label className="fn-label" htmlFor="fn-name">Name</label>
            <input id="fn-name" className="fn-input" value={form.name} onChange={set('name')} placeholder="Your full name" required />
          </div>
          <div className="fn-field">
            <label className="fn-label" htmlFor="fn-email">Email</label>
            <input id="fn-email" className="fn-input" type="email" value={form.email} onChange={set('email')} placeholder="you@brand.com" required />
          </div>
          <div className="fn-field">
            <label className="fn-label" htmlFor="fn-phone">Phone</label>
            <input id="fn-phone" className="fn-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" required />
          </div>
          <div className="fn-field">
            <label className="fn-label" htmlFor="fn-prof">Profession / Designation</label>
            <input id="fn-prof" className="fn-input" value={form.profession} onChange={set('profession')} placeholder="e.g. Founder, CEO, E-commerce Manager" />
          </div>

          {error && <div className="fn-error">{error}</div>}

          <button className="fn-btn" type="submit" disabled={submitting}>
            {submitting ? 'Unlocking…' : 'Click Here to Proceed to the Next Step →'}
          </button>
        </form>

        <p className="fn-disclaimer">
          <strong>Disclaimer</strong> — This is a Shopify Conversion Optimization program
          specifically designed for DTC e-commerce brands already investing in paid traffic.
          Please don&apos;t proceed if you don&apos;t belong to this audience.
        </p>
      </div>

      <ul className="fn-bullets">
        <li><span className="tick">✅</span> Why founder-led Shopify brands aren&apos;t converting the traffic they&apos;re already paying for.</li>
        <li><span className="tick">✅</span> The hidden conversion mistakes silently killing your ROAS and profits.</li>
        <li><span className="tick">✅</span> The exact conversion optimization system that helps Shopify brands consistently achieve 2%+ conversion rates without increasing ad spend.</li>
      </ul>
      </div>
    </>
  );
}
