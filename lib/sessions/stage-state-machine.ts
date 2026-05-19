export type StageStatus = 'pending' | 'active' | 'paused' | 'completed';
export type StageVerb =
  | 'start'
  | 'pause'
  | 'resume'
  | 'extend'
  | 'advance'
  | 'rollback'
  | 'reset';

const ALLOWED: Record<StageStatus, ReadonlySet<StageVerb>> = {
  pending: new Set(['start']),
  active: new Set(['pause', 'extend', 'advance', 'reset']),
  paused: new Set(['resume', 'extend', 'advance', 'reset']),
  completed: new Set(['rollback']),
};

export function isValidTransition(from: StageStatus, verb: StageVerb): boolean {
  return ALLOWED[from].has(verb);
}
