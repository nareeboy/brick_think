'use client';

// Event-driven narration indicator. Bars animate while `active` (speech is being
// detected) and rest at a flat line otherwise. There is no amplitude data — the
// motion is a canned, staggered oscillation. Reduced motion is handled purely in
// CSS (the keyframe animation only applies under prefers-reduced-motion: no-preference),
// so reduced-motion users see the static resting bars.

const BAR_COUNT = 32;

// Per-bar phase offsets (seconds) so the bars ripple rather than move in unison.
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => {
  // Deterministic, no Math.random: a small triangle wave of delays.
  const phase = (i % 6) - 3; // -3..2
  return -(Math.abs(phase) * 0.1);
});

const STYLE = `
@keyframes bt-wave {
  0%, 100% { transform: scaleY(0.22); }
  50% { transform: scaleY(1); }
}
@media (prefers-reduced-motion: no-preference) {
  .bt-wave-bar--active { animation: bt-wave 0.85s ease-in-out infinite; }
}
`;

interface Props {
  active: boolean;
}

export function NarrationWaveform({ active }: Props) {
  return (
    <div
      role="img"
      aria-label="recording in progress"
      data-testid="narration-waveform"
      className="mb-2 flex h-8 items-center justify-between rounded-lg bg-zinc-50 px-2"
    >
      <style>{STYLE}</style>
      {BARS.map((delay, i) => (
        <span
          key={i}
          className={`bt-wave-bar h-5 w-[3px] rounded-full bg-[#c0613d] transition-transform duration-200 ${
            active ? 'bt-wave-bar--active' : ''
          }`}
          style={{
            transformOrigin: 'center',
            transform: active ? undefined : 'scaleY(0.22)',
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}
