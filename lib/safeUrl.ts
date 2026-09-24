// User-submitted links are rendered as clickable hrefs in admin — only allow
// real https URLs (no javascript:, data:, or look-alike schemes).
export function httpsUrlOrNull(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s || s.length > 2000) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}
