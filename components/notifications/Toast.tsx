'use client';

import type { ReactNode } from 'react';

/**
 * Redesigned in-app toast card. Soft tinted surface + a filled rounded-square
 * icon chip per variant, a bold title, optional body, an optional right-aligned
 * action button, and an optional dismiss ×. Presentational only — callers own
 * mounting/positioning and the dismiss/action behaviour. (The live
 * notification plumbing in NotificationsProvider is wired to these variants in
 * a follow-up step.)
 */

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface VariantStyle {
  /** Card surface + border. */
  surface: string;
  /** Icon chip fill. */
  chip: string;
  /** Live-region politeness. */
  role: 'status' | 'alert';
  ariaLive: 'polite' | 'assertive';
  icon: (props: { className?: string }) => ReactNode;
}

const VARIANTS: Record<ToastVariant, VariantStyle> = {
  success: {
    surface: 'border-[#b9e0ce] bg-[#f1faf5]',
    chip: 'bg-[#54be9a]',
    role: 'status',
    ariaLive: 'polite',
    icon: CheckIcon,
  },
  error: {
    surface: 'border-[#ebc9bd] bg-[#fcf3f0]',
    chip: 'bg-[#d75e4c]',
    role: 'alert',
    ariaLive: 'assertive',
    icon: XCircleGlyph,
  },
  info: {
    surface: 'border-[#c2daf1] bg-[#f0f6fd]',
    chip: 'bg-[#5097d6]',
    role: 'status',
    ariaLive: 'polite',
    icon: InfoIcon,
  },
  warning: {
    surface: 'border-[#ead9ae] bg-[#fdf8ee]',
    chip: 'bg-[#e0a23b]',
    role: 'status',
    ariaLive: 'polite',
    icon: WarningIcon,
  },
};

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  variant: ToastVariant;
  title: string;
  /** Optional supporting copy. Wraps to multiple lines. */
  description?: ReactNode;
  /** Right-aligned action button (e.g. "Try again"). */
  action?: ToastAction;
  /** When provided, renders a dismiss × in the top-right. */
  onDismiss?: () => void;
  className?: string;
}

export function Toast({ variant, title, description, action, onDismiss, className }: ToastProps) {
  const v = VARIANTS[variant];
  const Icon = v.icon;

  return (
    <div
      role={v.role}
      aria-live={v.ariaLive}
      className={`relative flex items-start gap-4 rounded-2xl border px-5 py-4 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.25)] ${v.surface} ${className ?? ''}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${v.chip}`}
      >
        <Icon className="h-5 w-5" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[16px] font-semibold leading-tight tracking-tight text-zinc-900">
          {title}
        </p>
        {description ? (
          <div className="text-[14px] leading-snug text-zinc-600">{description}</div>
        ) : null}
      </div>

      {action ? (
        <button
          type="button"
          onClick={(e) => {
            // Don't let a wrapping <Link> navigate when the action is clicked.
            e.preventDefault();
            e.stopPropagation();
            action.onClick();
          }}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center self-center rounded-xl border border-zinc-300 bg-white px-4 text-[14px] font-medium text-zinc-800 transition-colors hover:bg-zinc-50 active:scale-[0.98]"
        >
          {action.label}
        </button>
      ) : null}

      {onDismiss ? (
        <button
          type="button"
          onClick={(e) => {
            // Stop the click from bubbling to a wrapping <Link> so dismissing
            // doesn't also navigate.
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Dismiss notification"
          className="-mr-1 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center self-start rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900/5 hover:text-zinc-600"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12.5l4.2 4.2L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XCircleGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="6.6" r="1.5" />
      <rect x="10.7" y="10" width="2.6" height="8" rx="1.3" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="10.7" y="6.5" width="2.6" height="8" rx="1.3" />
      <circle cx="12" cy="17.4" r="1.5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
    </svg>
  );
}
