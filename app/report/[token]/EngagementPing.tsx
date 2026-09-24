'use client';

// Reports how long the lead actually reads their teaser and how far they
// scroll. Heartbeats every 10s while the tab is visible; a final beacon on
// pagehide catches the last partial interval.
import { useEffect } from 'react';

export default function EngagementPing({ token, viewId }: { token: string; viewId: string }) {
  useEffect(() => {
    if (!viewId) return;
    const started = Date.now();
    let maxScroll = 0;
    let hiddenMs = 0;
    let hiddenSince: number | null = null;

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable > 0) {
        maxScroll = Math.max(maxScroll, Math.min(100, Math.round(((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100)));
      }
    };
    const onVisibility = () => {
      if (document.hidden) hiddenSince = Date.now();
      else if (hiddenSince) { hiddenMs += Date.now() - hiddenSince; hiddenSince = null; }
    };
    const payload = () => JSON.stringify({
      viewId,
      seconds: Math.round((Date.now() - started - hiddenMs - (hiddenSince ? Date.now() - hiddenSince : 0)) / 1000),
      scrollPct: maxScroll,
    });
    const url = `/api/report/${token}/engagement`;
    const send = () => { navigator.sendBeacon?.(url, new Blob([payload()], { type: 'application/json' })) || fetch(url, { method: 'POST', body: payload(), keepalive: true }).catch(() => {}); };

    onScroll();
    const timer = setInterval(() => { if (!document.hidden) send(); }, 10_000);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', send);
    return () => {
      clearInterval(timer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', send);
    };
  }, [token, viewId]);

  return null;
}
