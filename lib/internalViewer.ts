// Our own opens of client-facing pages (reports, proposals, tracked links)
// must not show up as lead activity. A viewer is "internal" when any holds:
//   - the request carries a valid admin session cookie (we are logged in),
//   - the edge geo city is one of ours (INTERNAL_CITIES, default "Indore"),
//   - the client IP is listed in INTERNAL_IPS (comma-separated).
// Internal views are still rendered; they are just not recorded, counted,
// pushed or shown on the timeline. Historical rows are hidden by city.

const cities = () => (process.env.INTERNAL_CITIES || 'Indore').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const ips = () => (process.env.INTERNAL_IPS || '').split(',').map((s) => s.trim()).filter(Boolean);

function decodeCity(v: string | null | undefined): string | null {
  if (!v) return null;
  try { return decodeURIComponent(v); } catch { return v; }
}

/** Sync check on a stored view row (for filtering history in the admin). */
export function isInternalPlace(city?: string | null, country?: string | null): boolean {
  const c = (city || '').toLowerCase();
  if (c && cities().includes(c)) return true;
  // Only our own team is in IN for now; US leads never are. Keep the city rule
  // as the primary signal so a future Indian lead is not hidden by mistake.
  void country;
  return false;
}

/** Check on an incoming request. `adminLoggedIn` is passed by App Router
 *  callers (await isAdmin()); this module must not import next/headers itself
 *  because lib/leadIntel is also bundled for Pages Router API routes. */
export async function isInternalViewer(h: Headers, adminLoggedIn = false): Promise<boolean> {
  if (adminLoggedIn) return true;
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim();
  if (ip && ips().includes(ip)) return true;
  return isInternalPlace(decodeCity(h.get('x-vercel-ip-city')), h.get('x-vercel-ip-country'));
}
