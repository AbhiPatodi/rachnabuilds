'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const VSL_URL = 'https://qkuazelkfqffcp2x.public.blob.vercel-storage.com/vsl/rachna-builds-vsl.mp4';

export default function WatchVsl() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // ── Watch analytics: accumulate real playtime + furthest position,
  //    beacon to our API so admin can see per-lead watch progress.
  const trackRef = useRef({ sessionId: '', email: '', watched: 0, maxPos: 0, lastT: -1, dirty: false });

  useEffect(() => {
    const t = trackRef.current;
    try {
      t.sessionId = sessionStorage.getItem('fn_vid_sid') || crypto.randomUUID();
      sessionStorage.setItem('fn_vid_sid', t.sessionId);
      t.email = (JSON.parse(sessionStorage.getItem('fn_lead') || '{}').email || '');
    } catch {
      t.sessionId = t.sessionId || `anon-${Math.random().toString(36).slice(2, 12)}`;
    }
  }, []);

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

  return (
    <>
      <div className="fn-hero">
        <div className="fn-hero-inner">
          <div className="fn-callout">Free Training · Watch Now</div>

          <h1 className="fn-h1">
            How To Build A <em>2%+ Converting</em> Shopify Store In 14 Days
          </h1>

          <p className="fn-sub">
            Without increasing your ad budget, or constantly tweaking your ads.
          </p>
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

      <p className="fn-disclaimer" style={{ maxWidth: 480, margin: '20px auto 0' }}>
        Apply for your <strong>Free Shopify Conversion Audit</strong> — we&apos;ll identify the
        conversion bottlenecks reducing your sales, whether you decide to work with us or not.
      </p>
      </div>

      <div className="fn-sticky-cta">
        <Link href="/training/apply" className="fn-btn">Apply Now for a 1:1 Consultation →</Link>
      </div>
    </>
  );
}
