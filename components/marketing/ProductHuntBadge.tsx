// Product Hunt launch badge. Renders the official embed as a plain anchor + img
// (the remote SVG carries query params + a cache-bust token, so it bypasses
// next/image optimisation on purpose). theme="light" suits both the dark hero
// and the cream footer band.

const POST_ID = '1163652';
const BADGE_TS = '1780598044171';
const PRODUCT_HUNT_URL =
  'https://www.producthunt.com/products/brickthink?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-brickthink';

export function ProductHuntBadge({
  theme = 'light',
  className = '',
}: {
  theme?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <a
      href={PRODUCT_HUNT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0613d] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="BrickThink — conduct LEGO® SERIOUS PLAY® workshops virtually, featured on Product Hunt"
        width={250}
        height={54}
        loading="lazy"
        decoding="async"
        src={`https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=${POST_ID}&theme=${theme}&t=${BADGE_TS}`}
        className="h-[54px] w-[250px]"
      />
    </a>
  );
}
