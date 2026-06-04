// "Launching soon on TinyLaunch" badge. Static SVG from TinyLaunch, rendered as
// a plain <a><img> like the other marketing badges. Used in the hero "As seen
// on" bar and the footer wall. NOTE: the href is TinyLaunch's homepage (per the
// supplied embed) — swap for the BrickThink listing URL once one exists.

const TINYLAUNCH_URL = 'https://tinylaunch.com';
const TINYLAUNCH_IMG = 'https://tinylaunch.com/tinylaunch_badge_launching_soon.svg';

export function TinyLaunchBadge({ className = '' }: { className?: string }) {
  return (
    <a
      href={TINYLAUNCH_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0613d] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={TINYLAUNCH_IMG}
        alt="Launching soon on TinyLaunch"
        width={619}
        height={188}
        loading="lazy"
        decoding="async"
        className="h-[54px] w-auto"
      />
    </a>
  );
}
