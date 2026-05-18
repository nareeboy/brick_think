'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import { isValidTag, normaliseTag } from '@/lib/my-designs/types';

import { renameTagAction } from './actions';

interface Props {
  tags: string[];
  onClose: () => void;
}

export function ManageTagsDialog({ tags, onClose }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) editInputRef.current?.focus();
  }, [editing]);

  function startEdit(tag: string) {
    setError(null);
    setDraft(tag);
    setEditing(tag);
  }

  function cancelEdit() {
    setError(null);
    setEditing(null);
    setDraft('');
  }

  function commitEdit(from: string) {
    const to = normaliseTag(draft);
    if (!isValidTag(to)) {
      setError('Tags can include lowercase letters, digits and hyphens (max 32 chars).');
      return;
    }
    if (to === from) {
      cancelEdit();
      return;
    }
    start(async () => {
      try {
        await renameTagAction(from, to);
        cancelEdit();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Rename failed');
      }
    });
  }

  return (
    <ModalBackdrop ariaLabel="Manage tags" dataTestid="manage-tags-dialog" onClose={onClose}>
      <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[16px] font-semibold text-zinc-900">Manage tags</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900"
          >
            ×
          </button>
        </div>
        {tags.length === 0 ? (
          <p className="text-[13px] text-zinc-500">No tags yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-900/5">
            {tags.map((tag) => (
              <li key={tag} className="flex items-center gap-2 py-2">
                {editing === tag ? (
                  <>
                    <input
                      ref={editInputRef}
                      type="text"
                      value={draft}
                      onChange={(e) => {
                        setError(null);
                        setDraft(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitEdit(tag);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelEdit();
                        }
                      }}
                      aria-label={`New name for ${tag}`}
                      data-testid={`manage-tags-input-${tag}`}
                      autoComplete="off"
                      className="h-8 flex-1 rounded-lg border border-zinc-900/10 bg-white px-3 font-mono text-[12px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#c0613d] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => commitEdit(tag)}
                      disabled={pending}
                      data-testid={`manage-tags-save-${tag}`}
                      className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-[#c0613d] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#a4502e] disabled:opacity-60"
                    >
                      {pending ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex h-8 cursor-pointer items-center rounded-lg px-2 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-900/5"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate font-mono text-[12px] text-zinc-700">
                      #{tag}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(tag)}
                      data-testid={`manage-tags-rename-${tag}`}
                      className="inline-flex h-8 cursor-pointer items-center rounded-lg px-2 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-900/5"
                    >
                      Rename
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {error ? (
          <p role="alert" className="mt-3 text-[12px] text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    </ModalBackdrop>
  );
}
