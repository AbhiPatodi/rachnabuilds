'use client';

// Read-time + scroll depth + which buttons were tapped, for the admin
// Proposal tab. Heartbeat every 10s while visible, final beacon on pagehide.
import { useEffect } from 'react';

export default function ProposalPing({ token, viewId }: { token: string; viewId: string }) {
  useEffect(() => {
    const started = Date.now();
    let hiddenMs = 0;
    let hiddenSince: number | null = null;
    let maxScroll = 0;
    const clicks = new Set<string>();
    const sectionSec: Record<string, number> = {};
    const inView = new Set<string>();
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const key = (en.target as HTMLElement).dataset.track;
        if (!key) continue;
        if (en.isIntersecting) inView.add(key); else inView.delete(key);
      }
    }, { threshold: 0.35 });
    document.querySelectorAll<HTMLElement>('[data-track]').forEach((el) => io.observe(el));
    const dwell = setInterval(() => {
      if (document.hidden) return;
      for (const key of inView) sectionSec[key] = (sectionSec[key] || 0) + 1;
    }, 1000);
    const url = `/api/proposal/${token}/ping`;
    const payload = () => JSON.stringify({
      viewId,
      seconds: Math.round((Date.now() - started - hiddenMs - (hiddenSince ? Date.now() - hiddenSince : 0)) / 1000),
      scrollPct: maxScroll,
      clicks: [...clicks],
      sections: sectionSec,
    });
    const send = () => { navigator.sendBeacon?.(url, new Blob([payload()], { type: 'application/json' })) || fetch(url, { method: 'POST', body: payload(), keepalive: true }).catch(() => {}); };
    const onScroll = () => {
      const doc = document.documentElement;
      maxScroll = Math.max(maxScroll, Math.min(100, Math.round(((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100)));
    };
    const onVisibility = () => {
      if (document.hidden) hiddenSince = Date.now();
      else if (hiddenSince) { hiddenMs += Date.now() - hiddenSince; hiddenSince = null; }
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-click]') as HTMLElement | null;
      if (el?.dataset.click) { clicks.add(el.dataset.click); send(); }
    };
    onScroll();
    const timer = setInterval(() => { if (!document.hidden) send(); }, 10_000);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('click', onClick, true);
    window.addEventListener('pagehide', send);
    return () => {
      clearInterval(timer);
      clearInterval(dwell);
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('pagehide', send);
    };
  }, [token, viewId]);
  return null;
}
