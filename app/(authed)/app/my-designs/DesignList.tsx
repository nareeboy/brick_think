'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';
import { deleteModelAction } from '@/app/(authed)/app/designs/actions';
import type { AggregateDesignRow } from '@/lib/my-designs/types';
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

  return (
    <ul
      data-testid="my-designs-list"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {designs.map((d) => (
        <DesignCard key={d.id} design={d} orgs={orgs} allTags={allTags} />
      ))}
    </ul>
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

  return (
    <li
      data-testid={`design-card-${design.id}`}
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
        className={`absolute ${canTrash ? (canSend ? 'right-[5.5rem]' : 'right-14') : 'right-6'} top-6 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 bg-white text-zinc-500 opacity-0 shadow-sm transition-all hover:text-zinc-900 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100`}
      >
        <TagIcon className="h-4 w-4" />
      </button>
      {canSend ? (
        <button
          type="button"
          onClick={() => setSending(true)}
          aria-label={`Send ${design.title} to a session`}
          data-testid={`send-${design.id}`}
          className="absolute right-14 top-6 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 bg-white text-zinc-500 opacity-0 shadow-sm transition-all hover:text-zinc-900 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      ) : null}
      {canTrash ? (
        <button
          ref={trashButtonRef}
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${design.title}`}
          className="absolute right-6 top-6 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 bg-white text-zinc-500 opacity-0 shadow-sm transition-all hover:text-zinc-900 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
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
  if (badge.kind === 'personal') {
    return (
      <p
        data-testid="design-badge"
        className="mt-2 inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600"
      >
        Personal
      </p>
    );
  }
  return (
    <p data-testid="design-badge" className="mt-2 flex max-w-full items-center gap-1.5">
      <span className="inline-block max-w-full shrink-0 truncate rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
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

function TrashIcon({ className = '' }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6 17.5 20a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7L5 6" />
    </svg>
  );
}
