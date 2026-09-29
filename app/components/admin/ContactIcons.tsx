'use client';
// One-tap contact icons next to a lead's name: WhatsApp · iMessage/SMS · Email.
// Client component so it can stop row-click propagation; safe to render from server pages.

export function smsHref(phone: string, text?: string) {
  const digits = phone.replace(/[^0-9+]/g, '');
  const num = digits.startsWith('+') ? digits : `+${digits}`;
  return text ? `sms:${num}&body=${text}` : `sms:${num}`;
}

const stop = (e: React.MouseEvent) => e.stopPropagation();

// Brand glyphs (brand colours are the recognisable part, so these stay literal).
const WhatsAppIcon = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);
const MessagesIcon = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id="imsg-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5AF575" /><stop offset="1" stopColor="#0BC935" /></linearGradient></defs>
    <rect width="24" height="24" rx="5.5" fill="url(#imsg-g)" />
    <path fill="#fff" d="M12 5.2c-4.1 0-7.4 2.7-7.4 6 0 1.9 1.1 3.6 2.8 4.7-.1.9-.5 1.9-1.2 2.6 1.4-.1 2.7-.7 3.6-1.4.7.2 1.4.2 2.2.2 4.1 0 7.4-2.7 7.4-6s-3.3-6.1-7.4-6.1z" />
  </svg>
);
const MailIcon = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.8 7 7.1 5.2a1.8 1.8 0 0 0 2.2 0L20.2 7" />
  </svg>
);

export default function ContactIcons({ phone, whatsapp, email, text, size = 'sm' }: {
  phone?: string | null; whatsapp?: string | null; email?: string | null;
  /** optional pre-filled message (already URL-encoded) */
  text?: string;
  size?: 'sm' | 'md';
}) {
  const number = whatsapp || phone || '';
  const wa = number.replace(/[^0-9]/g, '');
  if (!wa && !email) return null;
  const px = size === 'md' ? 32 : 26;
  const ic = size === 'md' ? 19 : 16;
  const box: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: px, height: px, borderRadius: 8,
    background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none', flexShrink: 0,
  };
  return (
    <span style={{ display: 'inline-flex', gap: 10, verticalAlign: 'middle', alignItems: 'center' }} onClick={stop}>
      {wa && <a href={`https://wa.me/${wa}${text ? `?text=${text}` : ''}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" aria-label="WhatsApp" style={box} onClick={stop}><WhatsAppIcon s={ic} /></a>}
      {wa && <a href={smsHref(number, text)} title="iMessage / SMS" aria-label="iMessage / SMS" style={box} onClick={stop}><MessagesIcon s={ic} /></a>}
      {email && <a href={`mailto:${email}`} title="Email" aria-label="Email" style={box} onClick={stop}><MailIcon s={ic} /></a>}
    </span>
  );
}
