import crypto from 'crypto';

// Server-side Meta Conversions API sender. Sends the same event Meta's
// Pixel already tracked in the browser, straight from our server — this is
// the copy that survives ad blockers, Safari ITP, and iOS privacy settings.
// No-ops cleanly (returns {ok:false, reason:'not_configured'}) until both
// env vars below are set, so the rest of the funnel works unaffected either
// way.
//
// Setup: Meta Events Manager → Data Sources → your Pixel → Settings →
// Conversions API → "Generate access token", then set META_CAPI_ACCESS_TOKEN
// in Vercel (server-only, never NEXT_PUBLIC_).

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const GRAPH_VERSION = 'v21.0';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

interface CapiEventOpts {
  eventName: 'Lead' | 'CompleteRegistration' | 'Schedule' | string;
  eventId: string;
  eventSourceUrl: string;
  email?: string | null;
  phone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  customData?: Record<string, unknown>;
}

export async function sendMetaCapiEvent(
  opts: CapiEventOpts,
): Promise<{ ok: boolean; reason?: string }> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return { ok: false, reason: 'not_configured' };
  }

  const userData: Record<string, unknown> = {};
  if (opts.email) userData.em = [sha256(opts.email)];
  if (opts.phone) userData.ph = [sha256(opts.phone.replace(/[^0-9]/g, ''))];
  if (opts.fbp) userData.fbp = opts.fbp;
  if (opts.fbc) userData.fbc = opts.fbc;
  if (opts.clientIpAddress) userData.client_ip_address = opts.clientIpAddress;
  if (opts.clientUserAgent) userData.client_user_agent = opts.clientUserAgent;

  const payload = {
    data: [
      {
        event_name: opts.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: opts.eventId,
        action_source: 'website',
        event_source_url: opts.eventSourceUrl,
        user_data: userData,
        ...(opts.customData ? { custom_data: opts.customData } : {}),
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Meta CAPI error:', res.status, text);
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('Meta CAPI send failed:', err);
    return { ok: false, reason: 'network_error' };
  }
}

/** Best-effort real client IP from standard proxy headers (Vercel sets
 *  x-forwarded-for). Falls back to undefined — CAPI works fine without it,
 *  just with slightly lower event match quality. */
export function clientIpFromHeaders(headers: Headers): string | undefined {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
}
