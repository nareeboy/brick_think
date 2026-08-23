import 'server-only';

// Server-rendered premium slots — the real implementations are async RSCs.
// The 'server-only' import is the seam's regression guard: a consumer that
// gains 'use client' now fails the OPEN-CORE build too, not just the hosted
// overlay build. Client-safe slots live in './client'.
export { ReportActionsSlot } from '@brickthink/premium/server-slots';
export type { ReportActionsSlotProps } from '@brickthink/premium';
export { BrandingSettingsSlot } from '@brickthink/premium/server-slots';
export type { BrandingSettingsSlotProps } from '@brickthink/premium';
export { AccountNavSlot } from '@brickthink/premium/server-slots';
export type { AccountNavSlotProps } from '@brickthink/premium';
export { AdminNavSlot } from '@brickthink/premium/server-slots';
export type { AdminNavSlotProps } from '@brickthink/premium';
export { ChatWidgetSlot } from '@brickthink/premium/server-slots';
export type { ChatWidgetSlotProps } from '@brickthink/premium';
export { HeaderPlanSlot } from '@brickthink/premium/server-slots';
export type { HeaderPlanSlotProps } from '@brickthink/premium';
export { AssistantEntrySlot } from '@brickthink/premium/server-slots';
export type { AssistantEntrySlotProps } from '@brickthink/premium';
