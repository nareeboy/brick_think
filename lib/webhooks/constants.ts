// Caps mirror the CHECK constraints in
// supabase/migrations/20260728090000_webhook_configs.sql — change both together.
export const WEBHOOK_TYPE_MAX = 64;
export const WEBHOOK_URL_MAX = 2000;
export const WEBHOOK_DESCRIPTION_MAX = 500;
export const WEBHOOK_DELAY_MAX_DAYS = 365;

export const TRIGGER_TYPES = ['signup', 'manual'] as const;
export type WebhookTriggerType = (typeof TRIGGER_TYPES)[number];

export const TRIGGER_TYPE_LABELS: Record<WebhookTriggerType, string> = {
  signup: 'Signup (after user registers)',
  manual: 'Manual (fired by hand only)',
};

export function isTriggerType(value: unknown): value is WebhookTriggerType {
  return typeof value === 'string' && (TRIGGER_TYPES as readonly string[]).includes(value);
}

export function isValidWebhookType(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= WEBHOOK_TYPE_MAX;
}

export function isValidWebhookUrl(value: string): boolean {
  if (value.length > WEBHOOK_URL_MAX || !value.startsWith('https://')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isValidDelayDays(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= WEBHOOK_DELAY_MAX_DAYS;
}
