'use client';

import { useEffect, useRef, useState } from 'react';

import { saveNarration } from '@/app/(authed)/app/designs/narration-actions';
import { useSpeechNarration } from '@/components/builder/useSpeechNarration';
import { LiveTranscriptChat } from '@/components/session/LiveTranscriptChat';
import { NarrationWaveform } from '@/components/session/NarrationWaveform';
import {
  broadcastNarrationSaved,
  useNarrationLiveChannel,
} from '@/components/session/narrationRealtime';
import {
  emptyLiveTranscript,
  reduceChunk,
  type LiveTranscriptState,
} from '@/lib/sessions/liveTranscript';

const NOTICE_KEY = 'bt_narration_notice_seen';

type Phase = 'idle' | 'prompted' | 'recording';

interface Props {
  modelId: string;
  sessionId: string;
  profileId: string;
  displayName: string;
}

/**
 * Facilitator-driven story capture on the participant's canvas. Renders nothing
 * until the facilitator starts recording for THIS model; then prompts the
 * participant to tap (authorising their mic), streams their words into the
 * shared live chat, and auto-saves when the facilitator stops. Only the
 * facilitator can stop — there is no participant Stop button.
 */
export function NarrationParticipantTrigger({ modelId, sessionId, profileId, displayName }: Props) {
  const speech = useSpeechNarration();
  const [phase, setPhase] = useState<Phase>('idle');
  const [noticeSeen, setNoticeSeen] = useState(true); // assume seen until localStorage read
  const [live, setLive] = useState<LiveTranscriptState>(emptyLiveTranscript);
  const [fallbackText, setFallbackText] = useState('');

  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
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
      setPhase('prompted');
      channel.sendAck({ modelId, profileId, state: 'prompted' });
    },
    onRecordingStop: (id) => {
      if (id !== modelId) return;
      if (phaseRef.current === 'recording') {
        if (speech.supported) {
          stopRequested.current = true;
          speech.stop();
        } else {
          void persist(fallbackRef.current);
        }
      }
      setPhase('idle');
    },
    onChunk: (chunk) => {
      if (chunk.modelId !== modelId) return;
      setLive((prev) => reduceChunk(prev, chunk));
    },
  });

  // Stream final-text deltas as final chunks while recording.
  useEffect(() => {
    if (phase !== 'recording' || !speech.supported) return;
    const full = speech.transcript;
    if (full.length > prevFinalRef.current.length) {
      const delta = full.slice(prevFinalRef.current.length);
      prevFinalRef.current = full;
      channel.sendChunk({ modelId, profileId, name: displayName, text: delta, isFinal: true });
    }
  }, [speech.transcript, phase, speech.supported, channel, modelId, profileId, displayName]);

  // Stream interim text.
  useEffect(() => {
    if (phase !== 'recording' || !speech.supported) return;
    channel.sendChunk({
      modelId,
      profileId,
      name: displayName,
      text: speech.interim,
      isFinal: false,
    });
  }, [speech.interim, phase, speech.supported, channel, modelId, profileId, displayName]);

  // When the facilitator stop lands, the recogniser ends → persist the full text.
  useEffect(() => {
    if (speech.status === 'stopped' && stopRequested.current) {
      stopRequested.current = false;
      void persist(speech.transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.status]);

  async function persist(raw: string): Promise<void> {
    const res = await saveNarration(modelId, raw, speech.durationMs || null);
    if (res.ok) {
      channel.sendAck({ modelId, profileId, state: 'saved' });
      void broadcastNarrationSaved(sessionId);
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

  return (
    <div
      data-testid="narration-participant-prompt"
      className="fixed bottom-5 left-1/2 z-40 w-[min(92vw,460px)] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35)]"
    >
      {phase === 'prompted' ? (
        <div>
          <p className="text-sm font-semibold text-zinc-900">Story capture started</p>
          {!noticeSeen ? (
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">
              Your browser converts your voice to text. BrickThink never stores or receives your
              audio — only the transcript. Your words appear live to the facilitator and your room.
            </p>
          ) : (
            <p className="mt-1 text-[12px] text-zinc-600">
              Tap to record the story of your model. The facilitator will stop the recording.
            </p>
          )}
          {speech.supported ? (
            <button
              type="button"
              onClick={beginRecording}
              data-testid="narration-participant-record"
              className="mt-3 inline-flex h-10 items-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white hover:bg-[#a85432]"
            >
              {noticeSeen ? 'Tap to record' : 'Allow mic & record'}
            </button>
          ) : (
            <div className="mt-3">
              <p className="mb-1 text-[12px] text-zinc-600">
                Voice capture isn&rsquo;t supported here — type your story; the facilitator will
                stop when you&rsquo;re done.
              </p>
              <textarea
                value={fallbackText}
                onChange={(e) => setFallbackText(e.target.value)}
                rows={4}
                aria-label="Narration text"
                className="block w-full rounded-lg border border-zinc-300 p-2 text-[13px]"
                onFocus={() => setPhase('recording')}
              />
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <p className="text-[12px] font-semibold text-zinc-700">
              Recording — the facilitator will stop when ready
            </p>
          </div>
          {speech.supported ? (
            <>
              <NarrationWaveform active={speech.speaking} />
              <div className="mt-2 max-h-[30vh] overflow-y-auto">
                <LiveTranscriptChat state={live} emptyHint="Start speaking…" />
              </div>
            </>
          ) : (
            <textarea
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              rows={4}
              aria-label="Narration text"
              className="block w-full rounded-lg border border-zinc-300 p-2 text-[13px]"
            />
          )}
        </div>
      )}
    </div>
  );
}
