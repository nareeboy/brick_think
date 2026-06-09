import Link from 'next/link';

export function BrandPresetsCard() {
  return (
    <section className="rounded-2xl border border-zinc-900/10 bg-white p-6">
      <h2 className="text-[16px] font-semibold tracking-tight text-zinc-950">Brand presets</h2>
      <p className="mt-1 text-[13px] text-zinc-600">
        White-label your PDF reports with your own logo, colours and fonts.
      </p>
      <Link
        href="/app/account/branding"
        className="mt-4 inline-flex h-9 items-center rounded-xl border border-zinc-300 px-4 text-sm hover:bg-zinc-50"
      >
        Manage brand presets
      </Link>
    </section>
  );
}
