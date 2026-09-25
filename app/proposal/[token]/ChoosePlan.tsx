'use client';

import { useState } from 'react';

export default function ChoosePlan({ token, tierId, tierLabel, primary, chosen, waNumber }: {
  token: string; tierId: string; tierLabel: string; primary: boolean; chosen: boolean; waNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(chosen ? 'done' : 'idle');

  const submit = async () => {
    setState('sending');
    const res = await fetch(`/api/proposal/${token}/accept`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tierId, note }),
    }).catch(() => null);
    setState(res?.ok ? 'done' : 'error');
  };

  const wa = `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi Rachna! We'd like to go ahead with the ${tierLabel}.`)}`;

  if (state === 'done' && !open) {
    return (
      <div className="pp-chosen">
        <b>✓ You chose the {tierLabel}.</b> We&apos;ll send payment details on WhatsApp shortly.{' '}
        <a href={wa} data-click="whatsapp">Message Rachna now →</a>
      </div>
    );
  }

  return (
    <>
      <button type="button" className={`pp-btn${primary ? '' : ' secondary'}`} data-click={`choose_${tierId}`} onClick={() => setOpen(true)}>
        Choose the {tierLabel} →
      </button>
      {open && (
        <div className="pp-modal-bg" onClick={() => state !== 'sending' && setOpen(false)}>
          <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
            {state === 'done' ? (
              <>
                <h3>Brilliant, thank you!</h3>
                <p>Rachna has been notified and will send payment details on WhatsApp shortly. We start the next working day after payment.</p>
                <a className="pp-btn" href={wa} data-click="whatsapp">Message Rachna on WhatsApp</a>
                <button type="button" className="pp-link" onClick={() => setOpen(false)}>Close</button>
              </>
            ) : (
              <>
                <h3>Go ahead with the {tierLabel}?</h3>
                <p>Nothing is charged here. We&apos;ll confirm on WhatsApp and send payment details.</p>
                <textarea placeholder="Anything we should know? (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} />
                {state === 'error' && <p className="pp-err">Something went wrong. Please message us on WhatsApp instead.</p>}
                <button type="button" className="pp-btn" disabled={state === 'sending'} onClick={submit}>
                  {state === 'sending' ? 'Sending…' : 'Yes, let’s go'}
                </button>
                <button type="button" className="pp-link" onClick={() => setOpen(false)}>Not yet</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
