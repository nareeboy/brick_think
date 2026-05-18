'use client';

export type TelemetryProps = Record<string, string | number | boolean | null | undefined>;

// Stub destination. Swap the console.debug body for a PostHog (or
// Sentry breadcrumb) call once an analytics provider is wired up
// in a dedicated phase. Keep the signature stable.
export function track(event: string, props?: TelemetryProps): void {
  if (typeof window === 'undefined') return;
  // eslint-disable-next-line no-console
  console.debug('[telemetry]', event, props ?? {});
}
