import type { ReportActionsSlotProps } from './types';

/**
 * Stub slot: renders nothing. On a self-host build there is no report button,
 * no brand picker, no upgrade modal. The private repo replaces this export.
 */
export function ReportActionsSlot(_props: ReportActionsSlotProps): null {
  return null;
}
