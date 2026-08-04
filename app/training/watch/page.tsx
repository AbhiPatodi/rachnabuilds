'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

const VSL_URL = 'https://qkuazelkfqffcp2x.public.blob.vercel-storage.com/vsl/rachna-builds-vsl.mp4';

export default function WatchVsl() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

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
    </>
  );
}
