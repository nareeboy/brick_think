'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useFocusTrap } from '@/lib/a11y/useFocusTrap';
import { usePrefersReducedMotion } from '@/lib/a11y/usePrefersReducedMotion';
import { useSpeechNarration } from '@/components/builder/useSpeechNarration';
import { NarrationWaveform } from '@/components/session/NarrationWaveform';
import { saveNarration } from '@/app/(authed)/app/designs/narration-actions';
import { broadcastNarrationSaved } from '@/components/session/narrationRealtime';
import type { ModelNarration } from '@/lib/sessions/modelNarration';

const NOTICE_KEY = 'bt_narration_notice_seen';

interface Props {
  modelId: string;
  sessionId: string;
  canRecord: boolean;
  initialNarration: ModelNarration | null;
  open: boolean;
  onClose: () => void;
}

type SaveState = 'idle' | 'saving' | 'error';

export function NarrationDrawer({
  modelId,
  sessionId,
  canRecord,
  initialNarration,
  open,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  useFocusTrap(dialogRef, open);

  const speech = useSpeechNarration();
  const [narration, setNarration] = useState<ModelNarration | null>(initialNarration);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [showRaw, setShowRaw] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [noticeSeen, setNoticeSeen] = useState(false);
  const [fallbackText, setFallbackText] = useState('');

  // I-2: single mount effect — read localStorage and flip mounted in one shot
  // so by the time mounted===true, noticeSeen already reflects persisted state.
  // This prevents both the hydration mismatch (nothing renders server-side in
  // the canRecord region) and the first-paint flash of the recorder before the
  // consent notice.
  useEffect(() => {
    setNoticeSeen(typeof window !== 'undefined' && window.localStorage.getItem(NOTICE_KEY) === '1');
    setMounted(true);
  }, []);

  // I-3: initial focus + Escape handler; defer focus so the panel is in DOM.
  useEffect(() => {
    if (!open) return;
    lastFocused.current = (document.activeElement as HTMLElement | null) ?? null;
    const id = window.setTimeout(() => {
      const btn = dialogRef.current?.querySelector('button');
      if (btn instanceof HTMLElement) btn.focus();
    }, 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    const node = lastFocused.current;
    if (node && typeof node.focus === 'function') node.focus();
  }, [open]);

  if (!open) return null;

  function acknowledgeNotice() {
    window.localStorage.setItem(NOTICE_KEY, '1');
    setNoticeSeen(true);
  }

  async function persist(raw: string, durationMs: number | null) {
    setSaveState('saving');
    const res = await saveNarration(modelId, raw, durationMs);
    if (!res.ok) {
      setSaveState('error');
      return;
    }
    setNarration((prev) => ({
      modelId,
      profileId: prev?.profileId ?? null,
      stageType:
        prev?.stageType ??
        initialNarration?.stageType ??
        ('individual_model' as ModelNarration['stageType']),
      transcript: res.transcript,
      transcriptRaw: raw.trim(),
      cleaned: res.cleaned,
      cleanupStatus: res.cleanupStatus,
      durationMs,
      updatedAt: new Date().toISOString(),
    }));
    setSaveState('idle');
    speech.reset();
    // M-2: clear fallback textarea on successful save so re-opening the
    // drawer doesn't pre-populate the old text.
    setFallbackText('');
    // Nudge the facilitator's session page to refresh so the Transcript button
    // (and combined room transcripts) appear without a manual refresh.
    void broadcastNarrationSaved(sessionId);
  }

  // Anchored left, no dark backdrop (the model stays visible on the right), and
  // portaled to document.body so its z-index escapes the `absolute z-30` chrome
  // wrapper it's mounted under — otherwise the Pieces button paints on top.
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-label="Model narration"
      className={`fixed left-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-r border-zinc-200 bg-white shadow-xl ${
        reducedMotion ? '' : 'motion-safe:animate-in motion-safe:slide-in-from-left'
      }`}
    >
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Model narration</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-9 w-9 items-center justify-center rounded p-1 text-zinc-400 hover:text-zinc-700"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 text-[13px] text-zinc-700">
        {/* I-2: the entire canRecord interactive region is gated on mounted so
              server render and first client render produce identical output
              (nothing here), and a first-time user always sees the notice
              before the recorder since noticeSeen is read from localStorage in
              the same effect that sets mounted. */}
        {mounted && canRecord && !noticeSeen ? (
          <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="leading-relaxed">
              When you record, your browser&rsquo;s speech engine converts your voice to text.
              BrickThink never stores or receives your audio — only the transcript is saved. Make
              sure everyone consents before recording.
            </p>
            <button
              type="button"
              onClick={acknowledgeNotice}
              data-testid="narration-notice-ack"
              className="mt-2 inline-flex h-9 items-center rounded-lg bg-zinc-900 px-3 text-[12px] font-medium text-white"
            >
              Got it
            </button>
          </div>
        ) : null}

        {mounted && canRecord && noticeSeen ? (
          speech.supported ? (
            <div className="mb-4" data-testid="narration-recorder">
              {speech.status === 'recording' ? (
                <>
                  <NarrationWaveform active={speech.speaking} />
                  <p className="mb-2 min-h-[3rem] rounded-lg bg-zinc-50 p-2 text-zinc-800">
                    {speech.transcript}
                    <span className="text-zinc-400">{speech.interim}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => speech.stop()}
                    data-testid="narration-stop"
                    className="inline-flex h-9 items-center rounded-lg bg-red-600 px-3 font-medium text-white"
                  >
                    Stop
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => speech.start()}
                  data-testid="narration-record"
                  className="inline-flex h-9 items-center rounded-lg bg-[#c0613d] px-3 font-medium text-white hover:bg-[#a85432]"
                >
                  {narration ? 'Re-record narration' : 'Record narration'}
                </button>
              )}
              {speech.status === 'stopped' && speech.transcript.trim() ? (
                <button
                  type="button"
                  onClick={() => persist(speech.transcript, speech.durationMs)}
                  data-testid="narration-save"
                  disabled={saveState === 'saving'}
                  className="ml-2 inline-flex h-9 items-center rounded-lg bg-zinc-900 px-3 font-medium text-white disabled:opacity-50"
                >
                  {saveState === 'saving' ? 'Saving…' : 'Save transcript'}
                </button>
              ) : null}
              {speech.error === 'mic_denied' ? (
                <p className="mt-2 text-red-700">
                  Microphone access is blocked — enable it in your browser settings.
                </p>
              ) : null}
              {speech.error === 'no_speech_detected' ? (
                <p className="mt-2 text-zinc-600">We didn&rsquo;t catch anything — try again.</p>
              ) : null}
              {saveState === 'error' ? (
                <p className="mt-2 text-red-700">Couldn&rsquo;t save the transcript. Try again.</p>
              ) : null}
            </div>
          ) : (
            <div className="mb-4" data-testid="narration-fallback">
              <p className="mb-2 text-zinc-600">
                Voice capture isn&rsquo;t supported in this browser — type or paste your narration.
              </p>
              <textarea
                value={fallbackText}
                onChange={(e) => setFallbackText(e.target.value)}
                rows={5}
                className="block w-full rounded-lg border border-zinc-300 p-2"
                aria-label="Narration text"
              />
              <button
                type="button"
                onClick={() => persist(fallbackText, null)}
                disabled={!fallbackText.trim() || saveState === 'saving'}
                className="mt-2 inline-flex h-9 items-center rounded-lg bg-zinc-900 px-3 font-medium text-white disabled:opacity-50"
              >
                {saveState === 'saving' ? 'Saving…' : 'Save transcript'}
              </button>
            </div>
          )
        ) : null}

        {narration ? (
          <div data-testid="narration-transcript">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
                Transcript
              </h3>
              {narration.cleaned ? (
                <span className="rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                  Polished by Claude
                </span>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">
              {showRaw ? narration.transcriptRaw : narration.transcript}
            </p>
            {narration.cleaned ? (
              <button
                type="button"
                onClick={() => setShowRaw((v) => !v)}
                className="mt-1 text-[12px] text-[#c0613d] underline-offset-2 hover:underline"
              >
                {showRaw ? 'Show polished' : 'View raw'}
              </button>
            ) : null}
            {narration.cleanupStatus === 'skipped' ? (
              <p className="mt-2 text-[12px] text-zinc-500">Saved as captured (not polished).</p>
            ) : null}
            {narration.cleanupStatus === 'failed' ? (
              <p className="mt-2 text-[12px] text-zinc-500">
                Couldn&rsquo;t polish — showing your words as captured.
              </p>
            ) : null}
          </div>
        ) : !canRecord ? (
          <p className="text-zinc-500">No narration recorded yet.</p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
