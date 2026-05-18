'use client';

import { useSessionStages } from './useSessionStages';
import { StageTimer } from './StageTimer';

type Props = { sessionId: string };

export function StageTimerContainer({ sessionId }: Props) {
  const { stages, session } = useSessionStages(sessionId);
  const currentStage = stages.find((s) => s.id === session?.current_stage_id) ?? null;
  return <StageTimer stage={currentStage} />;
}
