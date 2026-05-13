import Link from 'next/link';

export function ExpiredLinkPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[#FAF7F1] px-6 text-center text-zinc-900">
      <h1 className="text-[22px] font-semibold tracking-tight">This link is no longer active</h1>
      <p className="max-w-md text-[14px] text-zinc-600">
        Ask the owner for a new link to view this design.
      </p>
      <Link
        href="/"
        rel="noopener noreferrer"
        className="mt-4 text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
      >
        Made with BrickThink →
      </Link>
    </div>
  );
}
