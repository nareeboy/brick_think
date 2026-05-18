import type { SessionContext } from '@/lib/sessions/types';

export interface CanPlaceLiveArgs {
  sessionContext: SessionContext | null;
  flagEnabled: boolean;
}

export function canPlaceLive({ sessionContext, flagEnabled }: CanPlaceLiveArgs): boolean {
  if (!flagEnabled) return false;
  if (!sessionContext) return false;
  return sessionContext.stageType === 'shared_model';
}
