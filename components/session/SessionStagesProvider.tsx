'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { useSessionStages, type SessionRow, type StageRow } from './useSessionStages';

interface SessionStagesValue {
  stages: StageRow[];
  session: SessionRow;
}

const SessionStagesContext = createContext<SessionStagesValue | null>(null);

// One Realtime stages/session subscription per session page. SessionStages and
// ActiveStageBar previously each opened their own channel (distinct topics, so
// Phoenix allowed it) plus their own initial refetch; the provider owns the
// single subscription and both read from context. Until the initial fetch
// resolves, the server-rendered rows are served so first paint carries live
// status pills and timers.
export function SessionStagesProvider({
  sessionId,
  initialStages,
  initialSession,
  children,
}: {
  sessionId: string;
  initialStages: StageRow[];
  initialSession: SessionRow;
  children: ReactNode;
}) {
  const { stages: liveStages, session: liveSession, ready } = useSessionStages(sessionId);
  const value: SessionStagesValue = {
    stages: ready ? liveStages : initialStages,
    session: ready && liveSession ? liveSession : initialSession,
  };
  return <SessionStagesContext.Provider value={value}>{children}</SessionStagesContext.Provider>;
}

export function useSessionStagesContext(): SessionStagesValue {
  const value = useContext(SessionStagesContext);
  if (!value) {
    throw new Error('useSessionStagesContext must be used inside <SessionStagesProvider>');
  }
  return value;
}
