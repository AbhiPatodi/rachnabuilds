'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SendTestPush({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const send = async () => {
    setState('sending');
    try {
      const res = await fetch('/api/admin/notifications/test', { method: 'POST' });
      if (!res.ok) throw new Error();
      setState('sent');
      router.refresh();
      setTimeout(() => setState('idle'), 4000);
    } catch {
      setState('error');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button className="admin-btn" onClick={send} disabled={disabled || state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send Test Notification'}
      </button>
      {state === 'sent' && (
        <span style={{ fontSize: 13, color: '#06D6A0' }}>
          Sent — check your device (and this list).
        </span>
      )}
      {state === 'error' && (
        <span style={{ fontSize: 13, color: '#ef4444' }}>Failed to send.</span>
      )}
      {disabled && (
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          Enable notifications on a device first.
        </span>
      )}
    </div>
  );
}
