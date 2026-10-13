'use client';

// Request-access form shown on a revoked report. Posts to the report's
// request-access route, which emails Rachna. Deliberately asks for nothing
// the visitor has to look up — a name and a way to reply is enough.
import { useState } from 'react';

export default function RequestAccess({ token, storeName }: { token: string; storeName: string }) {
  const [state, setState] = useState<'idle' | 'open' | 'sending' | 'done' | 'error'>('idle');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [note, setNote] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setState('sending');
    try {
      const res = await fetch(`/api/report/${token}/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, note }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="ra-done">
        <b>Thank you — that&apos;s with Rachna.</b>
        <p>She&apos;ll be in touch shortly about the {storeName} report.</p>
      </div>
    );
  }

  if (state !== 'open' && state !== 'sending' && state !== 'error') {
    return (
      <button type="button" className="ra-btn" onClick={() => setState('open')}>
        Request access to this report
      </button>
    );
  }

  return (
    <form className="ra-form" onSubmit={submit}>
      <label htmlFor="ra-name">Your name</label>
      <input id="ra-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />

      <label htmlFor="ra-contact">Email or WhatsApp number</label>
      <input
        id="ra-contact"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="So Rachna can reply"
        required
      />

      <label htmlFor="ra-note">Anything you&apos;d like to add (optional)</label>
      <textarea id="ra-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />

      <button type="submit" className="ra-btn" disabled={state === 'sending' || !contact.trim()}>
        {state === 'sending' ? 'Sending…' : 'Send request'}
      </button>
      {state === 'error' && (
        <p className="ra-err">
          That didn&apos;t send. Please email{' '}
          <a href="mailto:hello@rachnabuilds.com">hello@rachnabuilds.com</a> instead.
        </p>
      )}
    </form>
  );
}
