import Link from 'next/link';

import { ExampleWorkshopButton } from './ExampleWorkshopButton';

// Shown when someone has no workshops at all — the first screen most new
// users see. It offers two ways forward rather than one: create the real
// thing, or open a finished example and look around first. The example is the
// lower-commitment path, so it sits second but is given equal weight in the
// copy.
export function WorkshopsEmptyState({
  newWorkshopHref,
  hasExample,
}: {
  newWorkshopHref: string;
  hasExample: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-900/15 bg-white/60 px-6 py-10 text-center sm:px-10">
      <h2 className="text-[17px] font-semibold text-zinc-900">Start your first workshop</h2>
      <p className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-relaxed text-zinc-600">
        A workshop is where your team builds models together and talks through what they mean. Set
        one up, or open an example to see how a finished one looks first.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-start">
        <Link
          href={newWorkshopHref}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white shadow-[0_20px_30px_-15px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47] focus-visible:ring-2 focus-visible:ring-[#a8482a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none"
        >
          New workshop
        </Link>
        <ExampleWorkshopButton hasExample={hasExample} />
      </div>
      <p className="mx-auto mt-6 max-w-[52ch] text-[12px] leading-relaxed text-zinc-500">
        The example is a complete workshop — five stages of models, the rooms the group worked in,
        and what each participant said about what they built. Nothing in it is shared with anyone
        else, and you can delete it whenever you like.
      </p>
    </div>
  );
}
