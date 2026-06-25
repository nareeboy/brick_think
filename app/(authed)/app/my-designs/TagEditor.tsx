'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { isValidTag, normaliseTag } from '@/lib/my-designs/types';

import { setModelTagsAction } from './actions';

const MAX_TAGS = 12;

interface Props {
  modelId: string;
  initialTags: string[];
  allTags: string[];
  onClose: () => void;
  onSaved?: (next: string[]) => void;
}

const MAX_SUGGESTIONS = 10;

export function TagEditor({ modelId, initialTags, allTags, onClose, onSaved }: Props) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function onClick(e: MouseEvent) {
      if (!dialogRef.current) return;
      if (!dialogRef.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  function addDraft() {
    const t = normaliseTag(draft);
    if (t.length === 0) return;
    if (!isValidTag(t)) {
      setError('Tags can include lowercase letters, digits and hyphens (max 32 chars).');
      return;
    }
    if (tags.includes(t)) {
      setError(null);
      setDraft('');
      return;
    }
    if (tags.length >= MAX_TAGS) {
      setError(`Up to ${MAX_TAGS} tags per design.`);
      return;
    }
    setError(null);
    setTags([...tags, t]);
    setDraft('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function addExisting(tag: string) {
    if (tags.includes(tag)) return;
    if (tags.length >= MAX_TAGS) {
      setError(`Up to ${MAX_TAGS} tags per design.`);
      return;
    }
    setError(null);
    setTags([...tags, tag]);
    // Keep the typeahead substring if there was one — the user is still
    // composing, and dropping their input here would feel unmotivated.
  }

  const draftNorm = normaliseTag(draft);
  const suggestions = allTags
    .filter((t) => !tags.includes(t))
    .filter((t) => (draftNorm.length === 0 ? true : t.includes(draftNorm)))
    .slice(0, MAX_SUGGESTIONS);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addDraft();
    } else if (e.key === 'Backspace' && draft.length === 0 && tags.length > 0) {
      e.preventDefault();
      setTags(tags.slice(0, -1));
    }
  }

  function save() {
    const next = [...tags];
    // Flush an unsubmitted draft if one is present.
    const pendingDraft = normaliseTag(draft);
    if (pendingDraft.length > 0 && isValidTag(pendingDraft) && !next.includes(pendingDraft)) {
      if (next.length >= MAX_TAGS) {
        setError(`Up to ${MAX_TAGS} tags per design.`);
        return;
      }
      next.push(pendingDraft);
    }
    start(async () => {
      try {
        const saved = await setModelTagsAction(modelId, next);
        onSaved?.(saved);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save tags');
      }
    });
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label="Edit tags"
      data-testid={`tag-editor-${modelId}`}
      className="absolute right-2 top-10 z-30 w-72 rounded-2xl border border-zinc-900/10 bg-white p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
    >
      <p className="mb-2 text-[13px] font-semibold text-zinc-900">Tags</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-900/5 px-2 py-0.5 font-mono text-[11px] text-zinc-700"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="ml-0.5 inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-900/10 hover:text-zinc-800"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => {
          setError(null);
          setDraft(e.target.value);
        }}
        onKeyDown={onKeyDown}
        placeholder="Add a tag…"
        aria-label="Add a tag"
        data-testid={`tag-editor-input-${modelId}`}
        autoComplete="off"
        className="mt-3 h-9 w-full rounded-lg border border-zinc-900/10 bg-white px-3 text-[13px] text-zinc-900 placeholder:text-zinc-500 focus:border-[#a8482a] focus:outline-none"
      />
      {suggestions.length > 0 ? (
        <div className="mt-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
            Suggestions
          </p>
          <div
            data-testid={`tag-editor-suggestions-${modelId}`}
            className="mt-1 flex flex-wrap gap-1"
          >
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addExisting(tag)}
                data-testid={`tag-editor-suggestion-${tag}`}
                className="inline-flex cursor-pointer items-center rounded-full border border-zinc-900/10 bg-white px-2 py-0.5 font-mono text-[11px] text-zinc-700 transition-colors hover:bg-zinc-900/5"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-[12px] text-red-600">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-900/5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          data-testid={`tag-editor-save-${modelId}`}
          className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-[#a8482a] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#a4502e] disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
