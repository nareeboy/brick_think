'use client';

import { useEffect, useRef } from 'react';

// Autoplaying product demo, JS-gated on prefers-reduced-motion (WCAG 2.2.2) —
// the CSS reduced-motion reset does not stop <video>. Deliberately not the
// shared HeroVideo component: the preview route keeps zero coupling to the
// live marketing chrome.
export function VideoPanel({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.removeAttribute('autoplay');
      video.pause();
    }
  }, []);

  return (
    <div className="hero-media">
      <video ref={ref} autoPlay muted loop playsInline src={src} />
    </div>
  );
}
