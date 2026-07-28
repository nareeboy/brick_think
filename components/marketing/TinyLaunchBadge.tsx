// "Featured on TinyLaunch" badge. Static SVG from TinyLaunch, rendered as
// a plain <a><img> like the other marketing badges. Used in the hero "As seen
// on" bar and the footer wall. Links to the BrickThink listing on TinyLaunch.

const TINYLAUNCH_URL = 'https://www.tinylaunch.com/launch/15841';
const TINYLAUNCH_IMG = 'https://tinylaunch.com/tinylaunch_badge_featured_on.svg';

export function TinyLaunchBadge({ className = '' }: { className?: string }) {
  return (
    <a
      href={TINYLAUNCH_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8482a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={TINYLAUNCH_IMG}
        alt="Featured on TinyLaunch"
        width={619}
        height={188}
        loading="lazy"
        decoding="async"
        className="h-[54px] w-auto"
      />
    </a>
  );
}
