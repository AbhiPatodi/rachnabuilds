'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CalendarSettingsPage() {
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const params = useSearchParams();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/calendar/status');
      const data = await res.json();
      setConnected(data.connected);
      setEmail(data.email);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const disconnect = async () => {
    if (!confirm('Disconnect Google Calendar? Bookings will stop syncing until you reconnect.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/admin/calendar/status', { method: 'DELETE' });
      await fetchStatus();
    } finally {
      setDisconnecting(false);
    }
  };

  const connectedParam = params.get('calendar_connected');
  const errorParam = params.get('calendar_error');

  if (loading) {
    return (
      <div className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading calendar status...</span>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Calendar</h1>
          <p className="admin-page-subtitle">Google Calendar sync for the booking system</p>
        </div>
      </div>

      {connectedParam && (
        <div className="admin-alert" style={{ marginBottom: 20, background: 'rgba(6,214,160,0.1)', color: 'var(--accent)', border: '1px solid rgba(6,214,160,0.25)' }}>
          Connected as {connectedParam} ✓
        </div>
      )}
      {errorParam && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: 20 }}>
          Connection failed: {errorParam}
        </div>
      )}

      <div className="admin-card" style={{ padding: 28, maxWidth: 560 }}>
        {connected ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
              <strong>Connected</strong>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
              Bookings sync to <strong style={{ color: 'var(--text)' }}>{email}</strong>. New calls check this
              calendar for conflicts and appear here automatically with a Google Meet link.
            </p>
            <button
              type="button"
              onClick={disconnect}
              disabled={disconnecting}
              style={{ background: 'none', border: '1px solid rgba(255,107,107,0.3)', color: '#FF6B6B', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              Connect the Google account you want bookings synced to (e.g. hello@rachnabuilds.com).
              Free/busy times block out slots automatically, and every booking creates a calendar
              event with a Google Meet link.
            </p>
            <a href="/api/admin/calendar/connect" className="admin-btn admin-btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Connect Google Calendar
            </a>
          </>
        )}
      </div>

      <div className="admin-card" style={{ padding: 24, maxWidth: 560, marginTop: 16 }}>
        <strong style={{ fontSize: 13 }}>Working hours (fixed in code for now)</strong>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
          Mon–Fri 9:00 AM–6:00 PM IST · Sat 10:00 AM–2:00 PM IST · Sun off<br />
          20-minute slots, 10-minute buffer, 12h minimum notice, 14 days ahead.<br />
          Edit <code>lib/availability.ts</code> to change these.
        </p>
      </div>
    </div>
  );
}
