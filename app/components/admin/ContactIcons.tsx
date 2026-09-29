'use client';
// One-tap contact icons next to a lead's name: WhatsApp · iMessage/SMS · Email.
// Client component so it can stop row-click propagation; safe to render from server pages.

export function smsHref(phone: string, text?: string) {
  const digits = phone.replace(/[^0-9+]/g, '');
  const num = digits.startsWith('+') ? digits : `+${digits}`;
  return text ? `sms:${num}&body=${text}` : `sms:${num}`;
}

const stop = (e: React.MouseEvent) => e.stopPropagation();

export default function ContactIcons({ phone, whatsapp, email, text, size = 'sm' }: {
  phone?: string | null; whatsapp?: string | null; email?: string | null;
  /** optional pre-filled message (already URL-encoded) */
  text?: string;
  size?: 'sm' | 'md';
}) {
  const number = whatsapp || phone || '';
  const wa = number.replace(/[^0-9]/g, '');
  if (!wa && !email) return null;
  const px = size === 'md' ? 30 : 24;
  const fs = size === 'md' ? 15 : 12.5;
  const box: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: px, height: px, borderRadius: 7,
    background: 'var(--bg-elevated)', border: '1px solid var(--border)', textDecoration: 'none', fontSize: fs, lineHeight: 1, flexShrink: 0,
  };
  return (
    <span style={{ display: 'inline-flex', gap: 5, verticalAlign: 'middle' }} onClick={stop}>
      {wa && <a href={`https://wa.me/${wa}${text ? `?text=${text}` : ''}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" style={box} onClick={stop}>💬</a>}
      {wa && <a href={smsHref(number, text)} title="iMessage / SMS" style={box} onClick={stop}>📱</a>}
      {email && <a href={`mailto:${email}`} title="Email" style={box} onClick={stop}>✉️</a>}
    </span>
  );
}
