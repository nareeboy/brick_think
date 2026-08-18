import type {
  AccountNavSlotProps,
  AdminNavSlotProps,
  BrandingSettingsSlotProps,
  ChatWidgetSlotProps,
  HeaderPlanSlotProps,
  ReportActionsSlotProps,
} from './types';

/**
 * Server-rendered slot stubs. The real implementations are async React Server
 * Components (they query Supabase / billing state), so consumers must be
 * server components — the `lib/premium/server-slots.tsx` seam enforces that
 * with `import 'server-only'` on BOTH sides of the seam. Client-safe slots
 * live in `./client` instead.
 */

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

/** Stub: no support chat on the open core. */
export function ChatWidgetSlot(_props: ChatWidgetSlotProps): null {
  return null;
}

/** Stub: no billing → no plan text in the header on the open core. */
export function HeaderPlanSlot(_props: HeaderPlanSlotProps): null {
  return null;
}
