'use client';

import { useState, useEffect, useCallback } from 'react';

interface Booking {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  startTime: string;
  endTime: string;
  meetLink: string | null;
  status: string;
  funnelLead: { challenge: string | null; revenue: string | null; readiness: string | null; financial: string | null } | null;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmed', color: '#06D6A0' },
  cancelled: { label: 'Cancelled', color: '#FF6B6B' },
  completed: { label: 'Completed', color: '#A78BFA' },
  no_show: { label: 'No-show', color: '#FBBF24' },
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bookings');
      setBookings(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, ...updated } : b)));
      }
    } finally {
      setBusyId(null);
    }
  };

  const now = Date.now();
  const filtered = bookings.filter((b) => {
    if (tab === 'upcoming') return new Date(b.startTime).getTime() >= now && b.status === 'confirmed';
    if (tab === 'past') return new Date(b.startTime).getTime() < now || b.status !== 'confirmed';
    return true;
  });

  if (loading) {
    return (
      <div className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading bookings...</span>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Bookings</h1>
          <p className="admin-page-subtitle">Strategy calls booked through the funnel</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {(['upcoming', 'past', 'all'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, textTransform: 'capitalize',
              color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div className="admin-card admin-empty">
            <div style={{ marginBottom: 8, fontSize: 32 }}>📅</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No {tab} bookings</div>
            <div>Calls booked through /training will appear here.</div>
          </div>
        )}

        {filtered.map((b) => {
          const meta = STATUS_META[b.status] ?? STATUS_META.confirmed;
          const when = new Date(b.startTime).toLocaleString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
          });
          return (
            <div key={b.id} className="admin-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {when} IST · {b.email}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}1f`, padding: '4px 10px', borderRadius: 100 }}>
                  {meta.label}
                </span>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {b.meetLink && (
                  <a href={b.meetLink} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary" style={{ fontSize: 12, padding: '7px 12px' }}>
                    Join Meet
                  </a>
                )}
                {b.whatsapp && (
                  <a href={`https://wa.me/${b.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary" style={{ fontSize: 12, padding: '7px 12px' }}>
                    WhatsApp
                  </a>
                )}
                {b.status === 'confirmed' && (
                  <>
                    <button type="button" disabled={busyId === b.id} onClick={() => updateStatus(b.id, 'completed')}
                      style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
                      Mark completed
                    </button>
                    <button type="button" disabled={busyId === b.id} onClick={() => updateStatus(b.id, 'no_show')}
                      style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
                      No-show
                    </button>
                    <button type="button" disabled={busyId === b.id} onClick={() => updateStatus(b.id, 'cancelled')}
                      style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,107,107,0.3)', color: '#FF6B6B', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
