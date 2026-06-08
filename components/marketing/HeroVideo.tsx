'use client';

import { useEffect, useRef } from 'react';

import { usePrefersReducedMotion } from '@/lib/a11y/usePrefersReducedMotion';

// Decorative hero background video. It's aria-hidden + muted, but a looping
// autoplay video still trips WCAG 2.2.2 (Pause, Stop, Hide) and is NOT covered
// by the global prefers-reduced-motion CSS reset in globals.css — that only
// neutralises CSS animations/transitions, never <video> playback.
//
// So playback is driven from JS instead of the `autoPlay` attribute: we play
// only when the user has no motion preference, and pause + rewind to the first
// frame otherwise, reacting live if the preference changes mid-visit. Because
// there's no `autoPlay` attribute, the video rests on its poster frame until JS
// decides it may move.
export function HeroVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    if (prefersReducedMotion) {
      video.pause();
      video.currentTime = 0;
    } else {
      // muted + playsInline → programmatic play() is permitted without a gesture
      void video.play().catch(() => {});
    }
  }, [prefersReducedMotion]);

  return (
    <video
      ref={ref}
      className={className}
      src={src}
      loop
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  );
}
