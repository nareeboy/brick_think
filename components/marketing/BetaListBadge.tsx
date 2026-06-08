// BrickThink's BetaList "featured" badge. Renders BetaList's remotely-hosted
// badge image as a plain <img> (no next/image remote-host config needed). Used
// in the footer "Featured on" wall.

const BETALIST_URL =
  'https://betalist.com/startups/brickthink?utm_campaign=badge-brickthink&utm_medium=badge&utm_source=badge-featured';

export function BetaListBadge({ className = '' }: { className?: string }) {
  return (
    <a
      href={BETALIST_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0613d] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://betalist.com/badges/featured?id=169251&theme=color"
        alt="BrickThink - Run full LSP workshops online with a real-time shared brick canvas | BetaList"
        width={156}
        height={54}
        loading="lazy"
        decoding="async"
        className="h-[54px] w-auto"
      />
    </a>
  );
}
