'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';
import { ExportMenu } from '@/components/exports/ExportMenu';
import { InfoIcon, TrashIcon } from '@/components/icons';
import { deleteModelAction } from '@/app/(authed)/app/designs/actions';
import { groupDesigns } from '@/lib/my-designs/types';
import type { AggregateDesignRow, DesignGroupKind } from '@/lib/my-designs/types';
import type { OrgSummary } from '@/lib/orgs/types';

import { SendToSessionDialog } from './SendToSessionDialog';
import { TagEditor } from './TagEditor';

interface Props {
  designs: AggregateDesignRow[];
  orgs: OrgSummary[];
  allTags: string[];
}

const MAX_VISIBLE_CARD_TAGS = 4;

export function DesignList({ designs, orgs, allTags }: Props) {
  if (designs.length === 0) {
    return (
      <p
        data-testid="my-designs-empty"
        className="rounded-2xl border border-dashed border-zinc-900/15 p-8 text-center text-[13px] text-zinc-500"
      >
        No designs yet. Click &ldquo;New design&rdquo; to start.
      </p>
    );
  }

  const groups = groupDesigns(designs);

  return (
    <div data-testid="my-designs-list" className="flex flex-col gap-9">
      {groups.map((group) => (
        <section
          key={group.kind}
          data-testid={`design-group-${group.kind}`}
          aria-labelledby={`design-group-${group.kind}-heading`}
        >
          <GroupHeader kind={group.kind} count={group.designs.length} />
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.designs.map((d) => (
              <DesignCard key={d.id} design={d} orgs={orgs} allTags={allTags} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// Section copy. The workshop note is the grid's only explanation for why those
// cards carry no trash action: session-scoped models are hard-deleted by the FK
// cascade from stages (20260514120000_session_designs.sql) and RLS refuses to
// soft-delete them, so deleting the workshop or its session is the only lever.
const GROUP_COPY: Record<DesignGroupKind, { heading: string; note: string | null }> = {
  personal: { heading: 'Personal designs', note: null },
  workshop: {
    heading: 'From workshops',
    note: 'Built inside a workshop — these can only be deleted when their workshop or session is deleted.',
  },
};

function GroupHeader({ kind, count }: { kind: DesignGroupKind; count: number }) {
  const { heading, note } = GROUP_COPY[kind];
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <h2
          id={`design-group-${kind}-heading`}
          className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-700"
        >
          {heading}
        </h2>
        <span
          data-testid={`design-group-${kind}-count`}
          className="inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-600"
        >
          {count}
        </span>
        {/* The divider itself: a hairline running from the label to the grid's
            right edge, so the two scopes read as separate bands. */}
        <span aria-hidden="true" className="h-px flex-1 bg-zinc-900/10" />
      </div>
      {note ? (
        <p
          data-testid={`design-group-${kind}-note`}
          className="flex items-start gap-1.5 text-[12px] leading-relaxed text-zinc-600"
        >
          <InfoIcon className="mt-[3px] h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <span className="max-w-[78ch]">{note}</span>
        </p>
      ) : null}
    </header>
  );
}

function DesignCard({
  design,
  orgs,
  allTags,
}: {
  design: AggregateDesignRow;
  orgs: OrgSummary[];
  allTags: string[];
}) {
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [tagsOverride, setTagsOverride] = useState<string[] | null>(null);
  const [pending, start] = useTransition();
  const trashButtonRef = useRef<HTMLButtonElement>(null);
  const tagButtonRef = useRef<HTMLButtonElement>(null);
  const visibleTags = tagsOverride ?? design.tags;

  const updated = new Date(design.updated_at);
  const updatedLabel = updated.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  function closeAndRestoreFocus() {
    setConfirming(false);
    queueMicrotask(() => trashButtonRef.current?.focus());
  }

  // Only personal designs can be trashed (RLS on soft-delete refuses
  // session-scoped rows by design — see 20260514120000_session_designs.sql).
  const canTrash = design.badge.kind === 'personal';
  // Sending a personal design into a session only makes sense if the user
  // belongs to at least one organisation with sessions to send to.
  const canSend = design.badge.kind === 'personal' && orgs.length > 0;
  // Tag editor follows the same posture as soft-delete: only the owner can
  // mutate tags, and ownership of a session-scoped row still belongs to the
  // creator, so allow tagging there too.

  // Hover-revealed action positions, right-to-left. Trash sits rightmost
  // when present; Export is always present so it claims the rightmost slot
  // when Trash is hidden.
  const slots: Array<'trash' | 'send' | 'tag' | 'export'> = [];
  if (canTrash) slots.push('trash');
  slots.push('export');
  if (canSend) slots.push('send');
  slots.push('tag');
  const offsetByIndex = ['right-6', 'right-14', 'right-[5.5rem]', 'right-[8rem]'];
  function rightFor(slot: 'trash' | 'send' | 'tag' | 'export'): string {
    const idx = slots.indexOf(slot);
    return offsetByIndex[idx] ?? 'right-6';
  }

  return (
    <li
      data-testid={`design-card-${design.id}`}
      data-scroll-target=""
      className="group relative rounded-2xl border border-zinc-900/10 bg-white p-4 transition-colors hover:bg-[#FAF7F1]"
    >
      <Link
        href={`/app/designs/${design.id}`}
        className="block"
        aria-label={`Open ${design.title}`}
      >
        <div
          data-testid="design-thumb"
          className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl border border-zinc-900/5 bg-[#FBF7F1]"
        >
          {design.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase signed URLs bypass next/image
            <img
              src={design.thumbnail_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <DotGridPlaceholder />
          )}
        </div>
        <p className="truncate text-[15px] font-semibold text-zinc-950">{design.title}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Updated {updatedLabel}
        </p>
        <Badge badge={design.badge} />
        {visibleTags.length > 0 ? (
          <div data-testid={`card-tags-${design.id}`} className="mt-2 flex flex-wrap gap-1">
            {visibleTags.slice(0, MAX_VISIBLE_CARD_TAGS).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-zinc-900/5 px-2 py-0.5 font-mono text-[10px] text-zinc-600"
              >
                #{tag}
              </span>
            ))}
            {visibleTags.length > MAX_VISIBLE_CARD_TAGS ? (
              <span
                data-testid={`card-tags-overflow-${design.id}`}
                title={visibleTags
                  .slice(MAX_VISIBLE_CARD_TAGS)
                  .map((t) => `#${t}`)
                  .join(' ')}
                className="inline-flex items-center rounded-full bg-zinc-900/5 px-2 py-0.5 font-mono text-[10px] text-zinc-600"
              >
                +{visibleTags.length - MAX_VISIBLE_CARD_TAGS}
              </span>
            ) : null}
          </div>
        ) : null}
      </Link>
      <button
        ref={tagButtonRef}
        type="button"
        onClick={() => setTagging(true)}
        aria-label={`Edit tags for ${design.title}`}
        data-testid={`tag-${design.id}`}
        className={`absolute ${rightFor('tag')} top-6 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 bg-white text-zinc-500 opacity-0 shadow-sm transition-all hover:text-zinc-900 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100`}
      >
        <TagIcon className="h-4 w-4" />
      </button>
      {canSend ? (
        <button
          type="button"
          onClick={() => setSending(true)}
          aria-label={`Send ${design.title} to a session`}
          data-testid={`send-${design.id}`}
          className={`absolute ${rightFor('send')} top-6 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 bg-white text-zinc-500 opacity-0 shadow-sm transition-all hover:text-zinc-900 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100`}
        >
          <SendIcon className="h-4 w-4" />
        </button>
      ) : null}
      <div className={`absolute ${rightFor('export')} top-6`} data-testid={`export-${design.id}`}>
        <ExportMenu source={{ kind: 'modelId', modelId: design.id }} size="card" />
      </div>
      {canTrash ? (
        <button
          ref={trashButtonRef}
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${design.title}`}
          className={`absolute ${rightFor('trash')} top-6 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 bg-white text-zinc-500 opacity-0 shadow-sm transition-all hover:text-zinc-900 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      ) : null}

      {tagging ? (
        <TagEditor
          modelId={design.id}
          initialTags={visibleTags}
          allTags={allTags}
          onClose={() => {
            setTagging(false);
            queueMicrotask(() => tagButtonRef.current?.focus());
          }}
          onSaved={(next) => setTagsOverride(next)}
        />
      ) : null}

      {sending ? (
        <SendToSessionDialog
          sourceModelId={design.id}
          orgs={orgs}
          onClose={() => setSending(false)}
        />
      ) : null}

      {confirming ? (
        <DeleteConfirmDialog
          title="Delete this design?"
          description={
            <>&ldquo;{design.title}&rdquo; moves to Trash. You can restore it within 30 days.</>
          }
          pending={pending}
          onCancel={closeAndRestoreFocus}
          onConfirm={() =>
            start(async () => {
              await deleteModelAction(design.id);
              setConfirming(false);
            })
          }
        />
      ) : null}
    </li>
  );
}

function Badge({ badge }: { badge: AggregateDesignRow['badge'] }) {
  // The section heading above the grid already reads "Personal designs", so a
  // per-card Personal chip would only repeat it. Workshop cards keep theirs
  // because it names *which* workshop — something the heading can't.
  if (badge.kind === 'personal') return null;
  return (
    <p data-testid="design-badge" className="mt-2 flex max-w-full items-center gap-1.5">
      <span className="inline-block max-w-full shrink-0 truncate rounded-md bg-orange-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-orange-900">
        {badge.orgName}
      </span>
      <span className="truncate text-[12px] text-zinc-600">{badge.sessionTitle}</span>
    </p>
  );
}

function DotGridPlaceholder() {
  return (
    <div
      aria-hidden="true"
      data-testid="design-thumb-placeholder"
      className="absolute inset-0"
      style={{
        backgroundImage: 'radial-gradient(rgba(60,30,15,0.10) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    />
  );
}

function SendIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m22 2-11 11" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </svg>
  );
}

function TagIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
  );
}
