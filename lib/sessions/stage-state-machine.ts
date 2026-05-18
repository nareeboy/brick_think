export type StageStatus = 'pending' | 'active' | 'paused' | 'completed';
export type StageVerb = 'start' | 'pause' | 'resume' | 'extend' | 'advance' | 'rollback';

const ALLOWED: Record<StageStatus, ReadonlySet<StageVerb>> = {
  pending: new Set(['start']),
  active: new Set(['pause', 'extend', 'advance']),
  paused: new Set(['resume', 'extend', 'advance']),
  completed: new Set(['rollback']),
};

export function isValidTransition(from: StageStatus, verb: StageVerb): boolean {
  return ALLOWED[from].has(verb);
}
