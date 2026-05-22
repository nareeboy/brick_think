import { Avatar } from '@/components/app/Avatar';

interface Props {
  name: string | null;
  avatarUrl: string | null;
  // Optional one-line role/tagline shown under the name. When omitted, a
  // sensible project-aligned default is used so the row never collapses to
  // just a name.
  tagline?: string;
}

const DEFAULT_TAGLINE = 'Building BrickThink, in the open.';

// Compact byline that sits at the foot of the article body — avatar + name +
// one-line tagline, sitting in a top-bordered band so it reads as a closing
// signature rather than another content section. Marketing voice convention:
// Fraunces upright on the name, Geist on the tagline, no italics, brand
// terracotta accent on the avatar fallback chip.
export function ArticleAuthorByline({ name, avatarUrl, tagline }: Props) {
  if (!name) return null;
  return (
    <section aria-label="About the author">
      <div className="mx-auto max-w-3xl border-t border-zinc-900/10 px-6 py-10 md:py-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Written by
        </p>
        <div className="mt-3 flex items-center gap-4">
          <Avatar url={avatarUrl} name={name} size="lg" />
          <div className="min-w-0">
            <p className="font-display text-[20px] font-medium leading-tight tracking-tight text-zinc-950">
              {name}
            </p>
            <p className="mt-0.5 truncate text-[14px] text-zinc-600">
              {tagline ?? DEFAULT_TAGLINE}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
