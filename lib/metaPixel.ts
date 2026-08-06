'use client';

// Client-side Meta Pixel helper. Pairs with lib/metaCapi.ts on the server —
// both sides use the SAME event_id for a given conversion so Meta dedupes
// the browser (pixel) and server (CAPI) copies into a single event instead
// of double-counting.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** One id per conversion — generate once at submit time and reuse for both
 *  the client fbq() call and the server CAPI call in the same request. */
export function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function trackMetaEvent(
  eventName: 'Lead' | 'CompleteRegistration' | 'Schedule' | string,
  eventId: string,
  customData?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', eventName, customData || {}, { eventID: eventId });
}

/** Meta's own cookies for browser/server event matching — _fbp is always
 *  set once the pixel loads; _fbc only exists if the visitor arrived via
 *  a Facebook/Instagram ad click (fbclid in the URL). */
export function getFbCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === 'undefined') return {};
  const get = (name: string) => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : undefined;
  };
  return { fbp: get('_fbp'), fbc: get('_fbc') };
}
