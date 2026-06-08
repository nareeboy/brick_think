'use client';

import { useEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '@/lib/a11y/usePrefersReducedMotion';

// Decorative hero background video. It's aria-hidden + muted, but a looping
// autoplay video still trips WCAG 2.2.2 (Pause, Stop, Hide): moving content
// that starts automatically and lasts more than 5s needs a mechanism to pause
// or stop it, for ALL users — not just those with a motion preference. The
// global prefers-reduced-motion CSS reset doesn't help either; it never touches
// <video> playback.
//
// So we (a) start paused for prefers-reduced-motion users and follow their
// preference until they take manual control, and (b) expose a real, keyboard-
// focusable pause/play button. Playback is driven from React state rather than
// the `autoPlay` attribute, so the video rests on its poster frame until we
// explicitly allow motion.
export function HeroVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);
  const userControlled = useRef(false);

  // Follow the OS motion preference until the user takes manual control.
  useEffect(() => {
    if (userControlled.current) return;
    setPlaying(!prefersReducedMotion);
  }, [prefersReducedMotion]);

  // Drive the element from state.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (playing) {
      // muted + playsInline → programmatic play() is permitted without a gesture
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing]);

  const toggle = () => {
    userControlled.current = true;
    setPlaying((p) => !p);
  };

  return (
    <>
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
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!playing}
        aria-label={playing ? 'Pause background video' : 'Play background video'}
        className="absolute bottom-6 right-6 z-20 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
      >
        {playing ? <PauseGlyph className="h-4 w-4" /> : <PlayGlyph className="h-4 w-4" />}
      </button>
    </>
  );
}

function PauseGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.29-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}
