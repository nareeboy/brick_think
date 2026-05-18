'use client';

import {
  advanceStageAction,
  extendStageAction,
  pauseStageAction,
  resumeStageAction,
  rollbackStageAction,
  startStageAction,
} from '@/app/(authed)/app/sessions/stage-controller-actions';

import { StageController, type StageActionsBundle } from './StageController';
import { useSessionStages } from './useSessionStages';

type Props = { sessionId: string; canManage: boolean };

const actions: StageActionsBundle = {
  start: startStageAction,
  pause: pauseStageAction,
  resume: resumeStageAction,
  extend: extendStageAction,
  advance: advanceStageAction,
  rollback: rollbackStageAction,
};

export function StageControllerContainer({ sessionId, canManage }: Props) {
  const { stages, session, ready } = useSessionStages(sessionId);
  if (!ready) return null;
  return <StageController stages={stages} session={session} canManage={canManage} actions={actions} />;
}
