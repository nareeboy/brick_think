// lib/banner/constants.ts

export const BANNER_MESSAGE_MAX = 280;

// Order matches the admin dropdown (Info, Warning, Error, Success, Promo).
export const BANNER_TYPES = ['info', 'warning', 'error', 'success', 'promo'] as const;
export type BannerType = (typeof BANNER_TYPES)[number];

export function isBannerType(value: string): value is BannerType {
  return (BANNER_TYPES as readonly string[]).includes(value);
}

export const BANNER_TYPE_LABELS: Record<BannerType, string> = {
  info: 'Info (Blue)',
  warning: 'Warning (Amber)',
  error: 'Error (Red)',
  success: 'Success (Green)',
  promo: 'Promo (Purple/Pink)',
};

// Tailwind classes. Each container pair clears WCAG 2.2 AA on its own tint
// (see app/(authed)/CLAUDE.md palette tables). Colour reinforces the icon +
// text; it is never the sole signal.
export const BANNER_TYPE_STYLES: Record<BannerType, { container: string; icon: string }> = {
  info: { container: 'bg-sky-50 text-sky-900 border-sky-200', icon: 'text-sky-600' },
  warning: { container: 'bg-amber-50 text-amber-900 border-amber-200', icon: 'text-amber-600' },
  error: { container: 'bg-rose-50 text-rose-900 border-rose-200', icon: 'text-rose-600' },
  success: {
    container: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    icon: 'text-emerald-700',
  },
  promo: {
    container: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200',
    icon: 'text-fuchsia-600',
  },
};
