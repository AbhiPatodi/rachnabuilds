'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Slot {
  start: string;
  end: string;
}

function groupByDay(slots: Slot[]) {
  const groups = new Map<string, Slot[]>();
  for (const slot of slots) {
    const d = new Date(slot.start);
    const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(slot);
  }
  return [...groups.entries()].map(([key, daySlots]) => ({
    key,
    label: new Date(daySlots[0].start).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }),
    slots: daySlots,
  }));
}

export default function BookingWidget() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [connected, setConnected] = useState(true);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState<{ startTime: string; meetLink: string | null } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('fn_lead') || '{}');
      setName(saved.name || '');
      setEmail(saved.email || '');
      setWhatsapp(saved.phone || '');
    } catch {}

    fetch('/api/booking/availability')
      .then((r) => r.json())
      .then((data) => {
        setConnected(data.connected);
        setEmbedUrl(data.embedUrl || null);
        setSlots(data.slots || []);
        const groups = groupByDay(data.slots || []);
        if (groups.length) setActiveDay(groups[0].key);
      })
      .catch(() => setSlots([]));
  }, []);

  const book = async () => {
    if (!selected || !name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      let funnelLeadId = '';
      try { funnelLeadId = sessionStorage.getItem('fn_lead_id') || ''; } catch {}
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(), whatsapp: whatsapp.trim() || undefined,
          start: selected.start, end: selected.end, funnelLeadId: funnelLeadId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setConfirmed({ startTime: data.startTime, meetLink: data.meetLink });
      setTimeout(() => router.push('/training/thank-you'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      // Refresh availability — the slot may have just been taken
      fetch('/api/booking/availability').then((r) => r.json()).then((d) => setSlots(d.slots || []));
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    const when = new Date(confirmed.startTime).toLocaleString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
    });
    return (
      <div className="fn-card" style={{ textAlign: 'center' }}>
        <div className="fn-callout" style={{ marginBottom: 16 }}>Call Confirmed ✓</div>
        <h3 className="fn-card-title">{when} IST</h3>
        <p style={{ fontSize: 14, color: 'rgba(10,31,19,0.65)', marginTop: 8 }}>
          A calendar invite with the Google Meet link is on its way to {email}.
        </p>
        {confirmed.meetLink && (
          <a href={confirmed.meetLink} target="_blank" rel="noopener noreferrer" className="fn-btn" style={{ marginTop: 20 }}>
            View Meeting Link →
          </a>
        )}
      </div>
    );
  }

  if (slots === null) {
    return <div className="fn-card" style={{ textAlign: 'center', color: 'rgba(10,31,19,0.5)' }}>Loading available times…</div>;
  }

  if (!connected && embedUrl) {
    // Google Calendar appointment-schedule booking page embed
    return (
      <div className="fn-card fn-card-wide" style={{ padding: 12 }}>
        <iframe
          src={embedUrl}
          title="Book your strategy call"
          style={{ width: '100%', height: 640, border: 0, borderRadius: 10 }}
        />
        <button className="fn-btn" type="button" style={{ marginTop: 14 }} onClick={() => router.push('/training/thank-you')}>
          I&apos;ve Booked My Call →
        </button>
      </div>
    );
  }

  if (!connected || slots.length === 0) {
    return (
      <div className="fn-card" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'rgba(10,31,19,0.65)', marginBottom: 20 }}>
          Our calendar link is being set up — we&apos;ll email you directly with your session time within 24 hours.
        </p>
        <button className="fn-btn" type="button" onClick={() => router.push('/training/thank-you')}>
          Continue →
        </button>
      </div>
    );
  }

  const days = groupByDay(slots);
  const activeSlots = days.find((d) => d.key === activeDay)?.slots || [];

  return (
    <div className="fn-card fn-card-wide">
      <h3 className="fn-card-title">Pick a time for your strategy call</h3>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => { setActiveDay(d.key); setSelected(null); }}
            style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${activeDay === d.key ? '#10B981' : 'rgba(10,31,19,0.15)'}`,
              background: activeDay === d.key ? 'rgba(16,185,129,0.08)' : '#fff',
              color: activeDay === d.key ? '#0A1F13' : 'rgba(10,31,19,0.65)',
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 8, marginBottom: 20 }}>
        {activeSlots.map((s) => {
          const time = new Date(s.start).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
          const isSelected = selected?.start === s.start;
          return (
            <button
              key={s.start}
              type="button"
              onClick={() => setSelected(s)}
              style={{
                padding: '10px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${isSelected ? '#10B981' : 'rgba(10,31,19,0.15)'}`,
                background: isSelected ? '#10B981' : '#fff',
                color: isSelected ? '#06170D' : '#0A1F13',
              }}
            >
              {time}
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          <div className="fn-field">
            <label className="fn-label" htmlFor="bk-name">Name</label>
            <input id="bk-name" className="fn-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="fn-field">
            <label className="fn-label" htmlFor="bk-email">Email</label>
            <input id="bk-email" className="fn-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="fn-field">
            <label className="fn-label" htmlFor="bk-wa">WhatsApp (optional)</label>
            <input id="bk-wa" className="fn-input" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>

          {error && <div className="fn-error">{error}</div>}

          <button className="fn-btn" type="button" disabled={submitting || !name.trim() || !email.trim()} onClick={book}>
            {submitting ? 'Booking…' : 'Confirm Call →'}
          </button>
        </>
      )}
    </div>
  );
}
