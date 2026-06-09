'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';
import type { BrandProfileSummary } from '@/lib/branding/types';

import { deleteBrandProfileAction } from './actions';
import { BrandPreviewCard } from './BrandPreviewCard';
import { BrandProfileEditor } from './BrandProfileEditor';

type FontOption = { key: string; label: string };

interface Props {
  initialProfiles: BrandProfileSummary[];
  entitled: boolean;
  fontOptions: FontOption[];
}

export function BrandProfilesManager({ initialProfiles, entitled, fontOptions }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<BrandProfileSummary | 'new' | null>(null);
  const [deleting, setDeleting] = useState<BrandProfileSummary | null>(null);
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteBrandProfileAction(target.id);
      if (result.ok) {
        setDeleting(null);
        router.refresh();
      } else {
        setDeleteError('Could not delete this preset. Please try again.');
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-lg text-zinc-900">Your presets</h2>
        <button
          type="button"
          disabled={!entitled}
          onClick={() => setEditing('new')}
          title={entitled ? undefined : 'Branded reports are part of the Client-Ready plan.'}
          className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#a44f30] disabled:cursor-not-allowed disabled:bg-zinc-300"
          data-testid="add-brand-preset"
        >
          Add preset
        </button>
      </div>

      {initialProfiles.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-[13px] text-zinc-600">
          No brand presets yet. {entitled ? 'Add one to white-label your reports.' : null}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {initialProfiles.map((profile) => (
            <li
              key={profile.id}
              className="flex items-center gap-4 rounded-2xl border border-zinc-900/10 bg-white p-4"
            >
              <div className="w-44 shrink-0">
                <BrandPreviewCard
                  brandColour={profile.brandColour}
                  accentColour={profile.accentColour}
                  displayName={profile.displayName}
                  logoUrl={profile.logoUrl}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-zinc-900">{profile.name}</p>
                <p className="truncate text-[13px] text-zinc-600">{profile.displayName}</p>
                {profile.footerContact ? (
                  <p className="truncate text-[12px] text-zinc-500">{profile.footerContact}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(profile)}
                  className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-zinc-300 px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleting(profile);
                  }}
                  className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-zinc-300 px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing !== null ? (
        <BrandProfileEditor
          existing={editing === 'new' ? null : editing}
          fontOptions={fontOptions}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteConfirmDialog
          title="Delete brand preset?"
          description={
            <>
              <span>
                This permanently removes “{deleting.name}” and its uploaded logo and fonts. Reports
                already generated are unaffected.
              </span>
              {deleteError ? (
                <span className="mt-2 block text-[#c0613d]" role="alert">
                  {deleteError}
                </span>
              ) : null}
            </>
          }
          confirmLabel="Delete preset"
          confirmPendingLabel="Deleting…"
          pending={deletePending}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}
