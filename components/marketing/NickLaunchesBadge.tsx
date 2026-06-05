// "Featured on Nick Launches" badge. Static SVG from nicklaunches.com, rendered
// as a plain <a><img> like the other marketing badges. Links to the BrickThink
// product listing with the supplied UTM campaign params.

const NICK_LAUNCHES_URL =
  'https://nicklaunches.com/products/brickthink/?utm_source=brickthink.io&utm_medium=badge&utm_campaign=featured';
const NICK_LAUNCHES_IMG = 'https://nicklaunches.com/badges/featured-dark.svg';

export function NickLaunchesBadge({ className = '' }: { className?: string }) {
  return (
    <a
      href={NICK_LAUNCHES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0613d] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={NICK_LAUNCHES_IMG}
        alt="BrickThink on Nick Launches"
        width={244}
        height={56}
        loading="lazy"
        decoding="async"
        className="h-[54px] w-auto"
      />
    </a>
  );
}
