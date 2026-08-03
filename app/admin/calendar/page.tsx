'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CalendarSettingsPage() {
  return (
    <Suspense fallback={<div className="admin-content" />}>
      <CalendarSettings />
    </Suspense>
  );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function decimalToTimeStr(dec: number) {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function timeStrToDecimal(str: string) {
  const [h, m] = str.split(':').map(Number);
  return h + (m || 0) / 60;
}

interface BookingConfigState {
  slotMinutes: number;
  bufferMinutes: number;
  lookaheadDays: number;
  minNoticeHours: number;
  workHours: Record<number, { start: number; end: number } | null>;
}

function CalendarSettings() {
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [savingEmbed, setSavingEmbed] = useState(false);
  const [embedSaved, setEmbedSaved] = useState(false);
  const [config, setConfig] = useState<BookingConfigState | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const params = useSearchParams();

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, settingsRes, configRes] = await Promise.all([
        fetch('/api/admin/calendar/status'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/calendar/config'),
      ]);
      const data = await statusRes.json();
      setConnected(data.connected);
      setEmail(data.email);
      const settings = await settingsRes.json();
      setEmbedUrl(settings.booking_embed_url || '');
      setConfig(await configRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const toggleDay = (dow: number) => {
    if (!config) return;
    setConfig({
      ...config,
      workHours: {
        ...config.workHours,
        [dow]: config.workHours[dow] ? null : { start: 9, end: 18 },
      },
    });
  };

  const setDayTime = (dow: number, field: 'start' | 'end', value: string) => {
    if (!config) return;
    const current = config.workHours[dow];
    if (!current) return;
    setConfig({
      ...config,
      workHours: { ...config.workHours, [dow]: { ...current, [field]: timeStrToDecimal(value) } },
    });
  };

  const saveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    setConfigSaved(false);
    try {
      await fetch('/api/admin/calendar/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    } finally {
      setSavingConfig(false);
    }
  };

  const saveEmbed = async () => {
    setSavingEmbed(true);
    setEmbedSaved(false);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'booking_embed_url', value: embedUrl.trim() }),
      });
      setEmbedSaved(true);
      setTimeout(() => setEmbedSaved(false), 2500);
    } finally {
      setSavingEmbed(false);
    }
  };

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
              calendar for conflicts and get a Google Meet link automatically. All site emails
              (lead notifications, booking confirmations) are also sent from this account via Gmail.
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
              Free/busy times block out slots automatically, every booking creates a calendar event
              with a Google Meet link, and all site emails (lead notifications, booking
              confirmations) send from this account via Gmail.
            </p>
            <a href="/api/admin/calendar/connect" className="admin-btn admin-btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Connect Google Calendar
            </a>
          </>
        )}
      </div>

      <div className="admin-card" style={{ padding: 24, maxWidth: 560, marginTop: 16 }}>
        <strong style={{ fontSize: 13 }}>Simple option — Google booking page embed</strong>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '8px 0 14px', lineHeight: 1.7 }}>
          No OAuth setup needed: in calendar.google.com create an <em>Appointment schedule</em>,
          copy its booking page link, and paste it here. The funnel shows this embed whenever the
          full integration above isn&apos;t connected.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/appointments/schedules/..."
            style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13 }}
          />
          <button
            type="button"
            onClick={saveEmbed}
            disabled={savingEmbed}
            className="admin-btn admin-btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            {embedSaved ? '✓ Saved' : savingEmbed ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {config && (
        <div className="admin-card" style={{ padding: 24, maxWidth: 640, marginTop: 16 }}>
          <strong style={{ fontSize: 13 }}>Working hours &amp; slot settings</strong>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '6px 0 18px' }}>
            All times in IST. Applies to both the custom picker and, once connected, conflict-checking.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {DAY_LABELS.map((label, dow) => {
              const hours = config.workHours[dow];
              return (
                <div key={dow} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: 90, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!hours} onChange={() => toggleDay(dow)} />
                    {label}
                  </label>
                  {hours ? (
                    <>
                      <input
                        type="time"
                        value={decimalToTimeStr(hours.start)}
                        onChange={(e) => setDayTime(dow, 'start', e.target.value)}
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 13 }}
                      />
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
                      <input
                        type="time"
                        value={decimalToTimeStr(hours.end)}
                        onChange={(e) => setDayTime(dow, 'end', e.target.value)}
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 13 }}
                      />
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Off</span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Slot length (min)</label>
              <input type="number" min={5} step={5} value={config.slotMinutes}
                onChange={(e) => setConfig({ ...config, slotMinutes: Number(e.target.value) })}
                style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Buffer between calls (min)</label>
              <input type="number" min={0} step={5} value={config.bufferMinutes}
                onChange={(e) => setConfig({ ...config, bufferMinutes: Number(e.target.value) })}
                style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Minimum notice (hours)</label>
              <input type="number" min={0} step={1} value={config.minNoticeHours}
                onChange={(e) => setConfig({ ...config, minNoticeHours: Number(e.target.value) })}
                style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Days ahead to show</label>
              <input type="number" min={1} max={60} step={1} value={config.lookaheadDays}
                onChange={(e) => setConfig({ ...config, lookaheadDays: Number(e.target.value) })}
                style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: 13 }} />
            </div>
          </div>

          <button type="button" onClick={saveConfig} disabled={savingConfig} className="admin-btn admin-btn-primary">
            {configSaved ? '✓ Saved' : savingConfig ? 'Saving…' : 'Save Hours & Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
