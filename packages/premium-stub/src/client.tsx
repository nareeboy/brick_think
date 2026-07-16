import type {
  AccountNavSlotProps,
  AdminNavSlotProps,
  BrandingSettingsSlotProps,
  PricingLinkSlotProps,
  ReportActionsSlotProps,
} from './types';

/**
 * Stub slot: renders nothing. On a self-host build there is no report button,
 * no brand picker, no upgrade modal. The private repo replaces this export.
 */
export function ReportActionsSlot(_props: ReportActionsSlotProps): null {
  return null;
}

/** Stub: no brand-profile management on the open core. */
export function BrandingSettingsSlot(_props: BrandingSettingsSlotProps): null {
  return null;
}

/** Stub: no billing tab → no account sub-nav on the open core. */
export function AccountNavSlot(_props: AccountNavSlotProps): null {
  return null;
}

/** Stub: no billing-admin section on the open core. */
export function AdminNavSlot(_props: AdminNavSlotProps): null {
  return null;
}

/** Stub: no hosted /pricing route on the open core → render no marketing link. */
export function PricingLinkSlot(_props: PricingLinkSlotProps): null {
  return null;
}
