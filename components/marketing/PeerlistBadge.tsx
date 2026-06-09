// BrickThink's Peerlist project listing. Renders the Peerlist logo lockup
// (local SVG in /public) as a link — a plain <img> so it needs no next/image
// SVG config. Used in both the hero "As seen on" bar and the footer wall.

const PEERLIST_URL = 'https://peerlist.io/nareshshan/project/brickthink';

export function PeerlistBadge({ className = '' }: { className?: string }) {
  return (
    <a
      href={PEERLIST_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8482a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/peerlist-seeklogo.svg"
        alt="BrickThink on Peerlist"
        width={218}
        height={56}
        loading="lazy"
        decoding="async"
        className="h-12 w-auto"
      />
    </a>
  );
}
