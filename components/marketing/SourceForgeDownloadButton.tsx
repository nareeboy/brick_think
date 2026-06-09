// SourceForge "Download brick_think" button — links to the latest release on
// SourceForge. Rendered as a static <a><img> (with a 2x srcset for retina),
// matching the other marketing badges. Footer only.

const SF_DOWNLOAD_URL = 'https://sourceforge.net/projects/brick-think/files/latest/download';
const SF_DOWNLOAD_IMG = 'https://a.fsdn.com/con/app/sf-download-button';

export function SourceForgeDownloadButton({ className = '' }: { className?: string }) {
  return (
    <a
      href={SF_DOWNLOAD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8482a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Download brick_think from SourceForge"
        src={SF_DOWNLOAD_IMG}
        srcSet={`${SF_DOWNLOAD_IMG}?button_size=2x 2x`}
        width={276}
        height={48}
        loading="lazy"
        decoding="async"
        className="h-12 w-auto"
      />
    </a>
  );
}
