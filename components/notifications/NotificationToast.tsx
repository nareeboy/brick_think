'use client';

import Link from 'next/link';

import { useNotifications } from '@/components/notifications/NotificationsProvider';

/**
 * Transient live-region toast — mirrors the builder's SaveToast shape so the
 * authed app has one consistent toast aesthetic. Fires automatically when
 * NotificationsProvider receives a Realtime INSERT for the current user,
 * OR on first mount via the missed-while-offline fallback, OR when any
 * server action calls `pushToast()` (admin-side confirmations).
 */
export function NotificationToast() {
  const { toast, dismissToast } = useNotifications();
  if (!toast) return null;

  const body = (
    <div className="pointer-events-auto inline-flex max-w-[min(420px,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-zinc-900/10 bg-white px-4 py-3 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]">
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#c0613d]/12 text-[#c0613d]"
      >
        <BellDotIcon className="h-4 w-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-medium text-zinc-900">{toast.title}</span>
        {toast.body ? (
          <span className="line-clamp-2 text-[12px] text-zinc-600">{toast.body}</span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={(e) => {
          // Stop the click from bubbling to a wrapping <Link> so the dismiss
          // button doesn't also navigate.
          e.preventDefault();
          e.stopPropagation();
          dismissToast();
        }}
        aria-label="Dismiss notification"
        className="ml-1 inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-900/5 hover:text-zinc-700"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
      data-testid="notification-toast"
    >
      {toast.link_url ? (
        <Link
          href={toast.link_url}
          onClick={dismissToast}
          className="pointer-events-auto contents"
          data-testid="notification-toast-link"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

function BellDotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M15 17h5l-1.4-1.7A2 2 0 0 1 18 14V11a6 6 0 0 0-5-5.9V4a1 1 0 1 0-2 0v1.1A6 6 0 0 0 6 11v3a2 2 0 0 1-.6 1.3L4 17h5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 17a3 3 0 0 0 6 0" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="6" r="2.5" fill="currentColor" stroke="none" />
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
