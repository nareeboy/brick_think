'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { saveNarration } from '@/app/(authed)/app/designs/narration-actions';
import { useSpeechNarration } from '@/components/builder/useSpeechNarration';
import { LiveTranscriptChat } from '@/components/session/LiveTranscriptChat';
import { useNarrationDrawer } from '@/components/session/NarrationDrawerContext';
import { NarrationWaveform } from '@/components/session/NarrationWaveform';
import {
  broadcastNarrationSaved,
  useNarrationLiveChannel,
} from '@/components/session/narrationRealtime';
import { usePrefersReducedMotion } from '@/lib/a11y/usePrefersReducedMotion';
import {
  emptyLiveTranscript,
  reduceChunk,
  type LiveTranscriptState,
} from '@/lib/sessions/liveTranscript';

const NOTICE_KEY = 'bt_narration_notice_seen';

type Phase = 'idle' | 'prompted' | 'recording' | 'saving' | 'saved' | 'denied';

interface Props {
  modelId: string;
  sessionId: string;
  profileId: string;
  displayName: string;
}

/**
 * Facilitator-driven story capture on the participant's canvas. Renders nothing
 * until the facilitator starts recording for THIS model; then a left slide-out
 * drawer streams the participant's words as they speak. When the facilitator
 * stops, the recogniser stops, the transcript is saved (polished by Claude when
 * the facilitator holds an API key) and the saved text is shown back to the
 * participant. Only the facilitator can stop — there is no participant Stop
 * button. The drawer is anchored left with no backdrop so the model stays
 * visible on the right, mirroring the old recorder drawer's placement.
 */
export function NarrationParticipantTrigger({ modelId, sessionId, profileId, displayName }: Props) {
  const speech = useSpeechNarration();
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [noticeSeen, setNoticeSeen] = useState(true); // assume seen until localStorage read
  const [live, setLive] = useState<LiveTranscriptState>(emptyLiveTranscript);
  const [fallbackText, setFallbackText] = useState('');
  const [savedTranscript, setSavedTranscript] = useState('');
  const [savedCleaned, setSavedCleaned] = useState(false);
  // The attendee can collapse the drawer (recording continues); the sidebar
  // reopen button brings it back so an accidental close isn't a dead end. State
  // is shared so that sidebar button (rendered elsewhere) can restore it.
  const { minimized, setMinimized, setActive } = useNarrationDrawer();

  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  // Report whether a drawer is in progress so the sidebar reopen button knows
  // when to offer itself; clear it on unmount (navigation away).
  useEffect(() => {
    setActive(phase !== 'idle');
  }, [phase, setActive]);
  useEffect(() => () => setActive(false), [setActive]);
  const prevFinalRef = useRef('');
  const fallbackRef = useRef('');
  fallbackRef.current = fallbackText;
  const stopRequested = useRef(false);

  useEffect(() => {
    setNoticeSeen(typeof window !== 'undefined' && window.localStorage.getItem(NOTICE_KEY) === '1');
  }, []);

  const channel = useNarrationLiveChannel(sessionId, {
    onRecordingStart: (id) => {
      if (id !== modelId) return;
      prevFinalRef.current = '';
      setLive(emptyLiveTranscript);
      setMinimized(false);
      // Auto-start without a tap when the browser will allow it: a participant
      // who has already acknowledged the one-time notice granted mic permission
      // before, so the recogniser can start programmatically. The first-ever
      // recording still shows the consent tap, and a blocked mic falls back to
      // the tap via the 'denied' phase (see the mic_denied effect).
      if (noticeSeen && speech.supported) {
        beginRecording();
      } else {
        setPhase('prompted');
        channel.sendAck({ modelId, profileId, state: 'prompted' });
      }
    },
    onRecordingStop: (id) => {
      if (id !== modelId) return;
      // Only the facilitator can stop. Stop the recogniser and move to 'saving';
      // the persist path then shows the saved text. If the participant never
      // started (still prompted), just dismiss.
      if (phaseRef.current !== 'recording') {
        setPhase('idle');
        return;
      }
      setPhase('saving');
      if (speech.supported) {
        stopRequested.current = true;
        speech.stop();
      } else {
        void persist(fallbackRef.current);
      }
    },
    onChunk: (chunk) => {
      if (chunk.modelId !== modelId) return;
      setLive((prev) => reduceChunk(prev, chunk));
    },
  });

  // Final-text deltas: render locally (instant, reliable — no broadcast
  // round-trip) AND broadcast to the rest of the room. With self:false the local
  // apply is the only source for the speaker's own words, so there's no double.
  useEffect(() => {
    if (phase !== 'recording' || !speech.supported) return;
    const full = speech.transcript;
    if (full.length > prevFinalRef.current.length) {
      const delta = full.slice(prevFinalRef.current.length);
      prevFinalRef.current = full;
      const chunk = { modelId, profileId, name: displayName, text: delta, isFinal: true };
      setLive((prev) => reduceChunk(prev, chunk));
      channel.sendChunk(chunk);
    }
  }, [speech.transcript, phase, speech.supported, channel, modelId, profileId, displayName]);

  // Interim text: local only. It updates many times per second; broadcasting
  // each one floods the realtime channel (and can get rate-limited, freezing the
  // feed). The speaker sees their own interim "writing"; the room sees finalised
  // bubbles as they land.
  useEffect(() => {
    if (phase !== 'recording' || !speech.supported) return;
    setLive((prev) =>
      reduceChunk(prev, {
        modelId,
        profileId,
        name: displayName,
        text: speech.interim,
        isFinal: false,
      }),
    );
  }, [speech.interim, phase, speech.supported, modelId, profileId, displayName]);

  // When the facilitator stop lands, the recogniser ends → persist the full text.
  useEffect(() => {
    if (speech.status === 'stopped' && stopRequested.current) {
      stopRequested.current = false;
      void persist(speech.transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.status]);

  // Mic blocked → tell the facilitator (declined) and show the participant a
  // recoverable message instead of a dead "Recording…" panel.
  useEffect(() => {
    if (phase === 'recording' && speech.error === 'mic_denied') {
      stopRequested.current = false;
      channel.sendAck({ modelId, profileId, state: 'declined' });
      setPhase('denied');
    }
  }, [speech.error, phase, channel, modelId, profileId]);

  async function persist(raw: string): Promise<void> {
    const res = await saveNarration(modelId, raw, speech.durationMs || null);
    if (res.ok) {
      setSavedTranscript(res.transcript);
      setSavedCleaned(res.cleaned);
      channel.sendAck({ modelId, profileId, state: 'saved' });
      void broadcastNarrationSaved(sessionId);
      setPhase('saved');
    } else {
      setPhase('idle');
    }
    setFallbackText('');
    speech.reset();
  }

  function beginRecording(): void {
    if (!noticeSeen) {
      window.localStorage.setItem(NOTICE_KEY, '1');
      setNoticeSeen(true);
    }
    setPhase('recording');
    channel.sendAck({ modelId, profileId, state: 'recording' });
    if (speech.supported) {
      prevFinalRef.current = '';
      speech.start();
    }
  }

  if (phase === 'idle') return null;

  // Collapsed: the drawer hides; the sidebar's reopen button restores it. The
  // recorder keeps running because this component stays mounted.
  if (minimized) return null;

  const headerTitle =
    phase === 'denied'
      ? 'Microphone blocked'
      : phase === 'saving'
        ? 'Saving your story…'
        : phase === 'saved'
          ? 'Story saved'
          : phase === 'recording'
            ? 'Recording your story'
            : 'Narrate your model';

  return createPortal(
    <div
      role="dialog"
      aria-label="Narrate your model"
      data-testid="narration-participant-prompt"
      className={`fixed left-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-r border-zinc-200 bg-white shadow-xl ${
        reducedMotion ? '' : 'motion-safe:animate-in motion-safe:slide-in-from-left'
      }`}
    >
      <header className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
        {phase === 'recording' ? (
          <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
        ) : null}
        <h2 className="text-sm font-semibold text-zinc-900">{headerTitle}</h2>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          aria-label="Close"
          title="Close — your recording keeps going"
          data-testid="narration-participant-close"
          className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded p-1 text-zinc-400 hover:text-zinc-700"
        >
          ✕
        </button>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto p-4 text-[13px] text-zinc-700">
        {phase === 'denied' ? (
          <div>
            <p className="leading-relaxed text-zinc-600">
              Enable microphone access in your browser settings, then tap to try again.
            </p>
            <button
              type="button"
              onClick={beginRecording}
              data-testid="narration-participant-retry"
              className="mt-3 inline-flex h-10 items-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white hover:bg-[#a85432]"
            >
              Try again
            </button>
          </div>
        ) : phase === 'saving' ? (
          <p className="text-zinc-600">Saving your story…</p>
        ) : phase === 'saved' ? (
          <div className="flex flex-1 flex-col">
            {savedCleaned ? (
              <span className="mb-2 inline-flex w-fit items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                Polished by Claude
              </span>
            ) : null}
            <p
              data-testid="narration-participant-saved"
              className="flex-1 overflow-y-auto whitespace-pre-wrap leading-relaxed text-zinc-800"
            >
              {savedTranscript || 'Saved — no words were captured.'}
            </p>
            <button
              type="button"
              onClick={() => setPhase('idle')}
              className="mt-3 inline-flex h-10 w-fit items-center rounded-xl border border-zinc-900/10 bg-white px-4 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-900/5"
            >
              Done
            </button>
          </div>
        ) : phase === 'prompted' ? (
          <div className="flex flex-1 flex-col">
            {!noticeSeen ? (
              <p className="leading-relaxed text-zinc-600">
                Your browser converts your voice to text. BrickThink never stores or receives your
                audio — only the transcript. Your words appear live to the facilitator and your
                room.
              </p>
            ) : (
              <p className="text-zinc-600">
                Tap to record the story of your model. The facilitator will stop the recording.
              </p>
            )}
            {speech.supported ? (
              <button
                type="button"
                onClick={beginRecording}
                data-testid="narration-participant-record"
                className="mt-3 inline-flex h-10 w-fit items-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white hover:bg-[#a85432]"
              >
                {noticeSeen ? 'Tap to record' : 'Allow mic & record'}
              </button>
            ) : (
              <div className="mt-3">
                <p className="mb-1 text-zinc-600">
                  Voice capture isn&rsquo;t supported here — type your story; the facilitator will
                  stop when you&rsquo;re done.
                </p>
                <textarea
                  value={fallbackText}
                  onChange={(e) => setFallbackText(e.target.value)}
                  rows={4}
                  aria-label="Narration text"
                  className="block w-full rounded-lg border border-zinc-300 p-2 text-[13px]"
                  onFocus={() => {
                    setPhase('recording');
                    channel.sendAck({ modelId, profileId, state: 'recording' });
                  }}
                />
              </div>
            )}
            {speech.supported ? (
              <div className="mt-4 flex-1 overflow-y-auto">
                <LiveTranscriptChat
                  state={live}
                  emptyHint="Your room's stories will appear here as people speak."
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {speech.supported ? (
              <>
                <NarrationWaveform active={speech.speaking} />
                <div className="mt-3 flex-1 overflow-y-auto">
                  <LiveTranscriptChat state={live} emptyHint="Start speaking…" />
                </div>
              </>
            ) : (
              <textarea
                value={fallbackText}
                onChange={(e) => setFallbackText(e.target.value)}
                rows={6}
                aria-label="Narration text"
                className="block w-full flex-1 rounded-lg border border-zinc-300 p-2 text-[13px]"
              />
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
