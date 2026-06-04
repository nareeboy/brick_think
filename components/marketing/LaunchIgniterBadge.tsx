// "Featured on LaunchIgniter" badge for BrickThink. Static image from the
// LaunchIgniter badge API, rendered as a plain <a><img> like the other
// marketing badges. Used in the hero "As seen on" bar and the footer wall.

const LAUNCHIGNITER_URL = 'https://launchigniter.com/product/brickthink?ref=badge-brickthink';
const LAUNCHIGNITER_IMG = 'https://launchigniter.com/api/badge/brickthink?theme=light';

export function LaunchIgniterBadge({ className = '' }: { className?: string }) {
  return (
    <a
      href={LAUNCHIGNITER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0613d] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LAUNCHIGNITER_IMG}
        alt="Featured on LaunchIgniter"
        width={212}
        height={55}
        loading="lazy"
        decoding="async"
        className="h-[55px] w-auto"
      />
    </a>
  );
}
