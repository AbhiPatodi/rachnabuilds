// Phone numbers to E.164 ("+919876543210") where the country is knowable.
// Most leads are US/UK/AU and arrive from Meta already in +<cc> form; this
// mainly fixes Indian numbers typed without a country code (98765 43210,
// 098765 43210, 919876543210). Anything ambiguous is returned trimmed but
// otherwise untouched — a wrong guess is worse than no guess.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (trimmed.startsWith('00') && digits.length > 10) return `+${digits.slice(2)}`;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;            // 98765 43210
  if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`;  // 098765 43210
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;            // 919876543210
  if (/^1[2-9]\d{9}$/.test(digits)) return `+${digits}`;             // 1 415 555 0100 (US/CA)
  if (/^44\d{10}$/.test(digits) || /^61\d{9}$/.test(digits)) return `+${digits}`; // UK / AU with cc, no +
  return trimmed;
}

/** Last 10 digits — good enough to spot the same number written two ways. */
export function phoneKey(raw: string | null | undefined): string | null {
  const d = (raw || '').replace(/[^0-9]/g, '');
  return d.length >= 8 ? d.slice(-10) : null;
}
