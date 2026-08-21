/**
 * Banner eyebrow for the app's top-level pages: the product name followed by
 * whoever is signed in, so a shared or projected screen makes the account
 * obvious at a glance. With no name resolved it renders the product name alone
 * rather than a dangling separator.
 */
export function BrandEyebrow({ name }: { name?: string | null }) {
  const trimmed = name?.trim();
  if (!trimmed) return <>BrickThink</>;
  return (
    <>
      {/* Real spaces around the dash, not margin: the separator is hidden from
          assistive tech, so without them the label is announced (and copied)
          as one run-on string. */}
      {'BrickThink '}
      <span aria-hidden="true" className="text-zinc-400">
        -
      </span>{' '}
      {trimmed}
    </>
  );
}
