'use client';

// Teaser page: let the lead name up to 3 competitors — we add a real-user
// speed comparison to their walkthrough. High-intent signal + call material.
import { useState } from 'react';

export default function CompetitorAsk({ token }: { token: string }) {
  const [values, setValues] = useState(['', '', '']);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  const submit = async () => {
    const competitors = values.map((v) => v.trim()).filter(Boolean);
    if (!competitors.length) return;
    setState('busy');
    try {
      const res = await fetch(`/api/report/${token}/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitors }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="rpt-comp">
        <h2>🥊 Comparison locked in</h2>
        <p>
          We&apos;ll benchmark your store against them with Google&apos;s real-user data and walk
          you through it on your free call — you&apos;ll see exactly where you win and where they do.
        </p>
      </div>
    );
  }

  return (
    <div className="rpt-comp">
      <h2>Who are your biggest competitors?</h2>
      <p>
        Name up to 3 competitor stores and we&apos;ll add a real-shopper speed comparison —
        you vs. them, from Google&apos;s own data — to your free walkthrough.
      </p>
      <div className="rpt-comp-row">
        {values.map((v, i) => (
          <input
            key={i}
            value={v}
            placeholder={i === 0 ? 'competitor-store.com' : 'optional'}
            onChange={(e) => setValues(values.map((x, j) => (j === i ? e.target.value : x)))}
          />
        ))}
        <button type="button" disabled={state === 'busy' || !values.some((v) => v.trim())} onClick={submit}>
          {state === 'busy' ? 'Saving…' : 'Compare Us →'}
        </button>
      </div>
      {state === 'error' && <p style={{ color: '#B42318', fontSize: 13, marginTop: 8 }}>Please enter valid store domains (e.g. store.com)</p>}
    </div>
  );
}
