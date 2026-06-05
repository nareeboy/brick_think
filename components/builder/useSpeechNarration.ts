'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal typings — SpeechRecognition is not in the default DOM lib.
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechResultLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
interface SpeechResultLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

type Status = 'idle' | 'recording' | 'stopped';
type ErrorCode = 'mic_denied' | 'no_speech_detected' | 'unknown' | null;

function getCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechNarration {
  supported: boolean;
  status: Status;
  transcript: string;
  interim: string;
  error: ErrorCode;
  durationMs: number;
  speaking: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechNarration(): UseSpeechNarration {
  const ctor = getCtor();
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const startedAt = useRef<number | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<ErrorCode>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const speakingTimer = useRef<number | null>(null);
  // Distinguishes an intentional end (explicit stop / terminal error / unmount)
  // from Chrome auto-ending on silence, which we resume from.
  const stoppingRef = useRef(false);

  const markSpeaking = useCallback(() => {
    setSpeaking(true);
    if (speakingTimer.current != null) window.clearTimeout(speakingTimer.current);
    speakingTimer.current = window.setTimeout(() => setSpeaking(false), 400);
  }, []);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    recRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setFinalText('');
    setInterim('');
    setError(null);
    setDurationMs(0);
    if (speakingTimer.current != null) window.clearTimeout(speakingTimer.current);
    setSpeaking(false);
    setStatus('idle');
  }, []);

  const start = useCallback(() => {
    if (!ctor) return;
    // Guard against a double-start leaking the previous recognition instance.
    if (status === 'recording') return;
    const rec = new ctor();
    recRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';
    rec.onresult = (e) => {
      let addedFinal = '';
      let nextInterim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r) continue;
        const text = r[0]?.transcript ?? '';
        if (r.isFinal) addedFinal += text;
        else nextInterim += text;
      }
      if (addedFinal) setFinalText((prev) => prev + addedFinal);
      setInterim(nextInterim);
      markSpeaking();
    };
    rec.onerror = (ev) => {
      const code = ev.error;
      // ONLY a denied mic is terminal. Every other error — `no-speech`,
      // `aborted`, `network`, `audio-capture` — is transient: Chrome fires these
      // routinely during a long dictation (especially around the auto-restart
      // boundary), and treating them as terminal stops capture "after a few
      // words". Leave stoppingRef false so onend resumes; only an explicit
      // stop(), a denied mic, or unmount truly ends the session.
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('mic_denied');
        stoppingRef.current = true; // terminal — do not auto-restart
      } else if (code === 'no-speech') {
        setError('no_speech_detected'); // transient — onend will resume
      } else {
        setError('unknown'); // transient — onend will resume
      }
    };
    rec.onend = () => {
      // Chrome ends recognition on silence even with continuous=true. Resume so
      // a pause mid-story doesn't end capture; only an explicit stop(), a
      // terminal error, or unmount sets stoppingRef and lets it truly stop.
      if (!stoppingRef.current) {
        try {
          rec.start();
          return;
        } catch {
          // engine refused to resume — fall through to a real stop
        }
      }
      if (startedAt.current != null) setDurationMs(Date.now() - startedAt.current);
      if (speakingTimer.current != null) window.clearTimeout(speakingTimer.current);
      setSpeaking(false);
      setStatus('stopped');
    };
    setError(null);
    setFinalText('');
    setInterim('');
    stoppingRef.current = false;
    startedAt.current = Date.now();
    setStatus('recording');
    rec.start();
  }, [ctor, status, markSpeaking]);

  // Stop any in-flight recognition if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      stoppingRef.current = true;
      recRef.current?.stop();
      if (speakingTimer.current != null) window.clearTimeout(speakingTimer.current);
    };
  }, []);

  return {
    supported: ctor != null,
    status,
    transcript: finalText,
    interim,
    error,
    durationMs,
    speaking,
    start,
    stop,
    reset,
  };
}
