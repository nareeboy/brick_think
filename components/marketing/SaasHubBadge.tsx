// BrickThink's SaaSHub listing. Renders the SaaSHub logo lockup (local PNG in
// /public) as a link — a plain <img>, matching the other marketing badges.
// Used in both the hero "As seen on" bar and the footer wall.

const SAASHUB_URL = 'https://www.saashub.com/brickthink';

export function SaasHubBadge({ className = '' }: { className?: string }) {
  return (
    <a
      href={SAASHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8482a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/saashub.png"
        alt="BrickThink on SaaSHub"
        width={602}
        height={178}
        loading="lazy"
        decoding="async"
        className="h-12 w-auto"
      />
    </a>
  );
}
