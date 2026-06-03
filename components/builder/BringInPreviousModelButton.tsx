'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from 'react';

import { bringInPreviousModel } from '@/app/(authed)/app/sessions/stage-import-actions';

import { useBuilderState } from './builderState';

interface BringInContextValue {
  /** Server-rendered: a model_imports row already exists at page load. */
  alreadyImported: boolean;
  /** Set true after a successful client_append in this page session, so the
   *  shared_model card can hide itself without waiting for a reload. */
  justImported: boolean;
  markJustImported: () => void;
  /** User clicked the close button without importing. */
  dismissed: boolean;
  setDismissed: (d: boolean) => void;
  /** Resolved label for the source stage; null when the affordance must not mount at all. */
  sourceStageLabel: string | null;
}

const BringInContext = createContext<BringInContextValue | null>(null);

export function BringInPreviousModelProvider({
  sourceStageLabel,
  alreadyImported,
  children,
}: {
  sourceStageLabel: string | null;
  alreadyImported: boolean;
  children: ReactNode;
}) {
  const [justImported, setJustImported] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const markJustImported = useCallback(() => setJustImported(true), []);

  return (
    <BringInContext.Provider
      value={{
        alreadyImported,
        justImported,
        markJustImported,
        dismissed,
        setDismissed,
        sourceStageLabel,
      }}
    >
      {children}
    </BringInContext.Provider>
  );
}

function useBringInState(): BringInContextValue {
  const ctx = useContext(BringInContext);
  if (!ctx) {
    throw new Error('BringIn components must be wrapped in <BringInPreviousModelProvider>');
  }
  return ctx;
}

/**
 * Returns true when the affordance is meaningful for this model + caller —
 * the model is session-scoped to a whitelisted target stage, the caller is
 * not read-only, no import has happened yet, and (for system_model) the
 * canvas is still empty. Card and reopen-button both gate on this.
 */
function useAffordanceEligible(): boolean {
  const { modelId, readOnly, bricks, liveMode } = useBuilderState();
  const { alreadyImported, justImported, sourceStageLabel } = useBringInState();
  if (!modelId || readOnly || sourceStageLabel === null) return false;
  if (alreadyImported || justImported) return false;
  if (!liveMode && bricks.length > 0) return false;
  return true;
}

const FAILURE_COPY: Record<string, string> = {
  model_not_found: 'This model is no longer available.',
  source_not_found_template: "You don't have a {sourceStageLabel} to bring in.",
  destination_not_empty: 'Cancel out your current canvas first.',
  already_imported: "You've already brought in your previous model.",
  unsupported_target_stage: 'This stage cannot import from a previous one.',
  invalid_uuid: 'Something went wrong. Reload and try again.',
  unauthenticated: 'Please sign in again.',
};

export function BringInPreviousModelCard() {
  const { modelId, appendImportedBricks } = useBuilderState();
  const { sourceStageLabel, markJustImported, dismissed, setDismissed } = useBringInState();
  const eligible = useAffordanceEligible();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!eligible || dismissed) return null;
  if (!modelId || sourceStageLabel === null) return null;

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const res = await bringInPreviousModel(modelId);
      if (!res.ok) {
        const templateKey =
          res.code === 'source_not_found' ? 'source_not_found_template' : res.code;
        const message = (FAILURE_COPY[templateKey] ?? FAILURE_COPY.invalid_uuid!).replace(
          '{sourceStageLabel}',
          sourceStageLabel,
        );
        setError(message);
        return;
      }
      if (res.mode === 'server_copied') {
        // BuilderProvider state initialises once via useState(()⇒…); a full
        // reload remounts the builder with the new initial canvas.
        window.location.reload();
        return;
      }
      // client_append (shared_model) — bricks land via Yjs in the local doc.
      // Mark imported so the card hides immediately without waiting for the
      // server-rendered alreadyImported prop to refresh on next navigation.
      appendImportedBricks(res.source);
      markJustImported();
    });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      <div className="pointer-events-auto relative rounded-2xl border border-zinc-900/10 bg-white/95 px-6 py-5 text-center shadow-[0_20px_40px_-20px_rgba(0,0,0,0.25)] backdrop-blur">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          title="Dismiss"
          data-testid="bring-in-previous-model-dismiss"
          className="absolute right-2 top-2 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-900/5 hover:text-zinc-700"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Continue your work
        </p>
        <h2 className="mt-2 text-[18px] font-semibold text-zinc-900">Bring in my previous model</h2>
        <p className="mt-1.5 max-w-[260px] text-[12px] text-zinc-600">
          Copies bricks from your {sourceStageLabel}. One-shot.
        </p>
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          data-testid="bring-in-previous-model"
          className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Bringing in…' : 'Bring in my previous model'}
        </button>
        {error ? (
          <p role="alert" className="mt-3 text-[12px] text-[#c0613d]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function BringInPreviousModelReopenButton() {
  const { dismissed, setDismissed } = useBringInState();
  const eligible = useAffordanceEligible();

  if (!eligible || !dismissed) return null;

  return (
    <button
      type="button"
      onClick={() => setDismissed(false)}
      data-testid="bring-in-previous-model-reopen"
      className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#c0613d]/30 bg-[#c0613d]/5 px-3 py-2.5 text-[13px] font-medium text-[#c0613d] transition-colors hover:bg-[#c0613d]/10"
    >
      Bring in my previous model
    </button>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}
