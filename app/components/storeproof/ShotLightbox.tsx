'use client';
// Click-to-enlarge for report screenshots. One overlay per page; the image
// source is swapped in on click, so each screenshot is embedded only once.
import React, { useEffect, useState } from 'react';

export default function ShotLightbox() {
  const [shot, setShot] = useState<{ src: string; label: string } | null>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const img = (e.target as HTMLElement).closest?.('img[data-lightbox]') as HTMLImageElement | null;
      if (!img) return;
      e.preventDefault();
      setShot({ src: img.src, label: img.alt });
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShot(null); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => {
    document.body.style.overflow = shot ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [shot]);
  if (!shot) return null;
  return (
    <div className="fr-lb" onClick={() => setShot(null)} role="dialog" aria-label={shot.label}>
      <button className="fr-lb-close" aria-label="Close" onClick={() => setShot(null)}>×</button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shot.src} alt={shot.label} onClick={(e) => e.stopPropagation()} />
      <div className="fr-lb-cap">{shot.label}</div>
    </div>
  );
}
