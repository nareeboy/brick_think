'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/(authed)/app/notifications/actions';
import { useNotifications } from '@/components/notifications/NotificationsProvider';
import type { NotificationRow } from '@/lib/notifications/types';

/**
 * Bell icon in the global header. Click → toggles a popover listing recent
 * notifications. Each row is a link to its target surface (org or session);
 * clicking marks the row read (optimistic + server-action persists). A
 * "Mark all read" affordance flips every unread row to read in one round-trip.
 */
export function NotificationsBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target;
      if (target instanceof Node && wrapperRef.current && !wrapperRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleRowClick = useCallback(
    (notification: NotificationRow) => {
      if (notification.read_at === null) {
        markRead(notification.id);
        void markNotificationReadAction(notification.id);
      }
      setOpen(false);
      if (notification.link_url) {
        router.push(notification.link_url);
      }
    },
    [markRead, router],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead();
    void markAllNotificationsReadAction();
  }, [markAllRead]);

  const badge = unreadCount > 9 ? '9+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="notifications-bell"
        className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white text-zinc-700 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
      >
        <BellIcon className="h-4 w-4" />
        {badge ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#c0613d] px-1 font-mono text-[10px] font-semibold leading-[18px] text-white"
          >
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          data-testid="notifications-panel"
          className="absolute right-0 top-12 z-30 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-center justify-between border-b border-zinc-900/5 px-4 py-3">
            <span className="text-[13px] font-semibold tracking-tight text-zinc-900">
              Notifications
            </span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="cursor-pointer rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-700"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-zinc-500">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <NotificationRowButton notification={n} onActivate={handleRowClick} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NotificationRowButton({
  notification,
  onActivate,
}: {
  notification: NotificationRow;
  onActivate: (n: NotificationRow) => void;
}) {
  const unread = notification.read_at === null;
  const content = (
    <span className="flex items-start gap-3 px-4 py-3">
      <span
        aria-hidden="true"
        className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
          unread ? 'bg-[#c0613d]' : 'bg-transparent'
        }`}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`truncate text-[13px] ${
            unread ? 'font-semibold text-zinc-900' : 'text-zinc-700'
          }`}
        >
          {notification.title}
        </span>
        {notification.body ? (
          <span className="line-clamp-2 text-[12px] text-zinc-500">{notification.body}</span>
        ) : null}
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          {formatRelative(notification.created_at)}
        </span>
      </span>
    </span>
  );

  if (notification.link_url) {
    return (
      <Link
        href={notification.link_url}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
          e.preventDefault();
          onActivate(notification);
        }}
        className="block w-full cursor-pointer text-left hover:bg-zinc-900/5 focus-visible:bg-zinc-900/5"
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onActivate(notification)}
      className="block w-full cursor-pointer text-left hover:bg-zinc-900/5 focus-visible:bg-zinc-900/5"
    >
      {content}
    </button>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M15 17h5l-1.4-1.7A2 2 0 0 1 18 14V11a6 6 0 0 0-5-5.9V4a1 1 0 1 0-2 0v1.1A6 6 0 0 0 6 11v3a2 2 0 0 1-.6 1.3L4 17h5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 17a3 3 0 0 0 6 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
