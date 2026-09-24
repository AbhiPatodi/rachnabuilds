// Validate + normalize a user-supplied store URL before we crawl it.
// The StoreProof worker runs on a machine inside a private network, so a URL
// pointing at localhost / RFC1918 / link-local / cloud-metadata addresses
// would turn "free audit" into a way to probe that network (SSRF).
export function normalizeStoreUrl(raw: unknown): { url: string; host: string } | null {
  const s = String(raw ?? '').trim();
  if (!s || s.length > 300) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== '80' && u.port !== '443') return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  // IP literals (v4 or v6) are never a real storefront
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':') || host.startsWith('[')) return null;
  if (host === 'localhost' || /\.(localhost|local|internal|lan|home|corp|intranet|test|invalid)$/.test(host)) return null;
  // must look like a public hostname: label.tld with an alphabetic TLD
  if (!/^([a-z0-9-]{1,63}\.)+[a-z]{2,24}$/.test(host)) return null;
  return { url: `https://${host}${u.pathname === '/' ? '' : u.pathname}`.replace(/\/$/, ''), host: host.replace(/^www\./, '') };
}
