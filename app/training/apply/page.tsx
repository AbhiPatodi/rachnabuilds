'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CHALLENGES = [
  { value: 'traffic_no_sales', label: 'Getting traffic but not enough sales' },
  { value: 'low_conversion', label: 'Low conversion rate' },
  { value: 'poor_roas', label: 'Poor ROAS' },
  { value: 'cart_abandonment', label: 'High cart abandonment' },
  { value: 'brand_mismatch', label: "Store doesn't reflect our brand" },
  { value: 'other', label: 'Other' },
];

const REVENUES = [
  { value: 'under_5k', label: 'Under $5,000' },
  { value: '5k_10k', label: '$5,000–$10,000' },
  { value: '10k_25k', label: '$10,000–$25,000' },
  { value: '25k_50k', label: '$25,000–$50,000' },
  { value: 'over_50k', label: '$50,000+' },
];

const FINANCIALS = [
  { value: 'ready_now', label: 'We have the budget to invest immediately.' },
  { value: 'can_invest', label: 'We can invest if the opportunity makes sense.' },
  { value: 'budget_challenge', label: 'Budget is currently a major challenge.' },
];

const READINESS = [
  { value: 'right_now', label: 'Right now' },
  { value: 'within_30_days', label: 'Within the next 30 days' },
  { value: 'later', label: 'More than 30 days' },
];

function RadioGroup({
  options, value, onChange, name,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  name: string;
}) {
  return (
    <div className="fn-radios">
      {options.map((o) => (
        <label key={o.value} className={`fn-radio${value === o.value ? ' selected' : ''}`}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export default function ApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', whatsapp: '', storeUrl: '', role: '',
    challenge: '', revenue: '', blocker: '', financial: '', readiness: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prefill from the opt-in step
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('fn_lead') || '{}');
      setForm((f) => ({
        ...f,
        name: saved.name || f.name,
        email: saved.email || f.email,
        whatsapp: saved.phone || f.whatsapp,
      }));
    } catch {}
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let utms = {};
      try { utms = JSON.parse(sessionStorage.getItem('fn_utms') || '{}'); } catch {}
      const res = await fetch('/api/funnel/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...utms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      router.push('/training/thank-you');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fn-callout">Application · Takes 2 Minutes</div>

      <h1 className="fn-h1">
        Apply to Get Your <em>Free Shopify Conversion Audit</em> &amp; Growth Strategy Session 👇
      </h1>

      <div className="fn-card fn-card-wide">
        <form onSubmit={submit}>
          <div className="fn-field">
            <label className="fn-label" htmlFor="ap-name">Full Name *</label>
            <input id="ap-name" className="fn-input" value={form.name} onChange={set('name')} required />
          </div>
          <div className="fn-field">
            <label className="fn-label" htmlFor="ap-email">Email *</label>
            <input id="ap-email" className="fn-input" type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="fn-field">
            <label className="fn-label" htmlFor="ap-wa">WhatsApp Number *</label>
            <input id="ap-wa" className="fn-input" type="tel" value={form.whatsapp} onChange={set('whatsapp')} required />
          </div>
          <div className="fn-field">
            <label className="fn-label" htmlFor="ap-url">Website / Shopify Store URL *</label>
            <input id="ap-url" className="fn-input" value={form.storeUrl} onChange={set('storeUrl')} placeholder="https://yourstore.com" required />
          </div>
          <div className="fn-field">
            <label className="fn-label" htmlFor="ap-role">What&apos;s your current role?</label>
            <input id="ap-role" className="fn-input" value={form.role} onChange={set('role')} placeholder="e.g. Founder, CEO, E-commerce Manager" />
          </div>

          <div className="fn-field">
            <span className="fn-label">What is the biggest challenge you&apos;re currently facing with your Shopify store? *</span>
            <RadioGroup name="challenge" options={CHALLENGES} value={form.challenge} onChange={setVal('challenge')} />
          </div>

          <div className="fn-field">
            <span className="fn-label">What is your current monthly revenue? *</span>
            <RadioGroup name="revenue" options={REVENUES} value={form.revenue} onChange={setVal('revenue')} />
          </div>

          <div className="fn-field">
            <label className="fn-label" htmlFor="ap-blocker">
              Be 100% honest. What do you believe is preventing your store from converting more visitors into customers? *
            </label>
            <textarea id="ap-blocker" className="fn-textarea" value={form.blocker} onChange={set('blocker')} required
              placeholder="The more specific you are, the faster we'll get you clarity during our session." />
          </div>

          <div className="fn-field">
            <span className="fn-label">Which best describes your financial situation? *</span>
            <RadioGroup name="financial" options={FINANCIALS} value={form.financial} onChange={setVal('financial')} />
          </div>

          <div className="fn-field">
            <span className="fn-label">How soon are you ready to improve your Shopify store? *</span>
            <RadioGroup name="readiness" options={READINESS} value={form.readiness} onChange={setVal('readiness')} />
          </div>

          {error && <div className="fn-error">{error}</div>}

          <button className="fn-btn" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit My Application →'}
          </button>
        </form>
      </div>
    </>
  );
}
