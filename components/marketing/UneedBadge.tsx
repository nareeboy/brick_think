// "Launching soon on Uneed" badge for BrickThink. Static image from Uneed,
// rendered as a plain <a><img> like the other marketing badges. Used in the
// hero "As seen on" bar and the footer wall.

const UNEED_URL = 'https://www.uneed.best/tool/brickthink';
const UNEED_IMG = 'https://www.uneed.best/EMBED3.png';

export function UneedBadge({ className = '' }: { className?: string }) {
  return (
    <a
      href={UNEED_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8482a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={UNEED_IMG}
        alt="Launching soon on Uneed"
        width={582}
        height={152}
        loading="lazy"
        decoding="async"
        className="h-[54px] w-auto"
      />
    </a>
  );
}
