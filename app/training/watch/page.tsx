'use client';

import { useRef, useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const VSL_URL = 'https://qkuazelkfqffcp2x.public.blob.vercel-storage.com/vsl/rachna-builds-vsl.mp4';

export default function WatchVslPage() {
  return (
    <Suspense fallback={null}>
      <WatchVsl />
    </Suspense>
  );
}

function WatchVsl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [gateChecked, setGateChecked] = useState(false);

  // ── Watch analytics: accumulate real playtime + furthest position,
  //    beacon to our API so admin can see per-lead watch progress.
  const trackRef = useRef({ sessionId: '', email: '', watched: 0, maxPos: 0, lastT: -1, dirty: false });

  useEffect(() => {
    const t = trackRef.current;
    let email = '';
    try {
      t.sessionId = sessionStorage.getItem('fn_vid_sid') || crypto.randomUUID();
      sessionStorage.setItem('fn_vid_sid', t.sessionId);
      email = JSON.parse(sessionStorage.getItem('fn_lead') || '{}').email || '';
      t.email = email;
    } catch {
      t.sessionId = t.sessionId || `anon-${Math.random().toString(36).slice(2, 12)}`;
    }

    const leadParam = searchParams.get('lead');
    if (email) {
      setGateChecked(true);
      return;
    }
    if (leadParam) {
      // Magic link from a follow-up email — restore this lead's session instead
      // of bouncing them to the opt-in form.
      fetch(`/api/funnel/lead/${leadParam}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((lead) => {
          if (!lead) { router.replace('/training'); return; }
          try {
            sessionStorage.setItem('fn_lead', JSON.stringify({ name: lead.name, email: lead.email, phone: lead.phone }));
            sessionStorage.setItem('fn_lead_id', lead.id);
          } catch {}
          t.email = lead.email;
          setGateChecked(true);
        })
        .catch(() => router.replace('/training'));
      return;
    }
    // Soft gate: no opt-in in this browser session and no magic link → back to opt-in
    router.replace('/training');
  }, [router, searchParams]);

  const sendProgress = useCallback((useBeacon = false) => {
    const t = trackRef.current;
    const v = videoRef.current;
    if (!t.sessionId || !t.dirty) return;
    t.dirty = false;
    const payload = JSON.stringify({
      sessionId: t.sessionId,
      email: t.email || undefined,
      secondsWatched: Math.round(t.watched),
      maxPosition: Math.round(t.maxPos),
      duration: Math.round(v?.duration || 0),
    });
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/funnel/video-progress', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/funnel/video-progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => sendProgress(), 15000);
    const onHide = () => sendProgress(true);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      onHide();
    };
  }, [sendProgress]);

  const onTimeUpdate = () => {
    const t = trackRef.current;
    const v = videoRef.current;
    if (!v || v.paused) return;
    const cur = v.currentTime;
    // Count only small forward deltas as real watch time (ignores seeks).
    if (t.lastT >= 0 && cur > t.lastT && cur - t.lastT < 2) t.watched += cur - t.lastT;
    if (cur > t.maxPos) t.maxPos = cur;
    t.lastT = cur;
    t.dirty = true;
  };

  const handlePlay = () => {
    setPlaying(true);
    videoRef.current?.play();
  };

  if (!gateChecked) return null;

  return (
    <>
      <div className="fn-hero fn-hero-compact">
        <div className="fn-hero-inner">
          <h1 className="fn-h1 fn-h1-sm">
            How To Build A <em>2%+ Converting</em> Shopify Store In 14 Days
          </h1>
        </div>
      </div>

      <div className="fn-body fn-body-raised">
      <div className="fn-video-wrap">
        <video
          ref={videoRef}
          src={VSL_URL}
          poster="/training/vsl-thumbnail.jpg"
          controls={playing}
          playsInline
          preload="metadata"
          onTimeUpdate={onTimeUpdate}
          onPause={() => { trackRef.current.lastT = -1; sendProgress(); }}
          onSeeked={() => { trackRef.current.lastT = videoRef.current?.currentTime ?? -1; }}
          onEnded={() => sendProgress()}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {!playing && (
          <button
            type="button"
            onClick={handlePlay}
            aria-label="Play the training video"
            className="fn-video-placeholder"
            style={{
              position: 'absolute', inset: 0, width: '100%', border: 'none', cursor: 'pointer',
              background: 'rgba(10,31,19,0.5)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16,
            }}
          >
            <div className="play">▶</div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>Click to play</p>
          </button>
        )}
      </div>

      <div className="fn-arrow">↓</div>

      <Link href="/training/apply" className="fn-btn" style={{ maxWidth: 420, margin: '0 auto' }}>
        Apply Now for a 1:1 Consultation →
      </Link>
      </div>

      <div className="fn-sticky-cta">
        <Link href="/training/apply" className="fn-btn">Apply Now for a 1:1 Consultation →</Link>
      </div>
    </>
  );
}
