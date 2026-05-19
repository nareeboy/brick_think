'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getBrowserSupabaseClient } from '@/lib/db/client';
import type { NotificationRow } from '@/lib/notifications/types';

interface NotificationsContextValue {
  notifications: NotificationRow[];
  unreadCount: number;
  ready: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  toast: NotificationRow | null;
  dismissToast: () => void;
  pushToast: (notification: NotificationRow) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside <NotificationsProvider>');
  }
  return ctx;
}

interface Props {
  profileId: string;
  initial: NotificationRow[];
  children: ReactNode;
}

const TOAST_AUTO_DISMISS_MS = 6000;
// Surface a toast on first mount for any unread notification whose `created_at`
// is within this window. Catches the "user wasn't online when the realtime
// INSERT happened" case (page-was-closed, sign-in-then-open, lost Wi-Fi, etc.)
// without spamming a toast for a five-day-old unread row.
const MISSED_WHILE_OFFLINE_MS = 5 * 60 * 1000;

/**
 * Mounted once in the authed layout. Hydrates from a server-fetched list,
 * then subscribes to Realtime INSERT/UPDATE events for this user's
 * notifications. New arrivals raise a transient toast in the bottom-centre
 * and prepend to the inbox.
 *
 * "Missed-while-offline" fallback: on first mount, any unread notification
 * whose `created_at` is within MISSED_WHILE_OFFLINE_MS surfaces as a toast.
 * Without this, a user who was added to an org while their browser was
 * closed (or while they were on a non-/app/* route) would see only the bell
 * badge increment — they'd miss the toast entirely.
 *
 * Subscribes by recipient_profile_id filter so RLS can drop other users'
 * payloads at the broker — the realtime.setAuth dance from useSessionStages
 * applies here too (INITIAL_SESSION on returning users doesn't set the
 * channel's JWT automatically).
 */
export function NotificationsProvider({ profileId, initial, children }: Props) {
  const [notifications, setNotifications] = useState<NotificationRow[]>(initial);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<NotificationRow | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const scheduleToastDismiss = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_AUTO_DISMISS_MS);
  }, []);

  const pushToast = useCallback(
    (notification: NotificationRow) => {
      setToast(notification);
      scheduleToastDismiss();
    },
    [scheduleToastDismiss],
  );

  // First-mount "missed-while-offline" toast surfacing. Looks at the initial
  // hydration set and fires a toast for the most-recent unread row if it's
  // within the missed-window. We fire AT MOST ONE on mount to avoid stacking.
  useEffect(() => {
    const cutoff = Date.now() - MISSED_WHILE_OFFLINE_MS;
    const recent = initial
      .filter((n) => n.read_at === null && new Date(n.created_at).getTime() >= cutoff)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const mostRecent = recent[0];
    if (mostRecent) {
      pushToast(mostRecent);
    }
    // Intentionally one-shot on mount — re-running on `initial` change would
    // duplicate toasts that the realtime path already handles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track ids we've already toasted so a realtime INSERT for a row that was
  // ALSO in the initial hydration (rare, but possible when the page renders
  // milliseconds after the row landed) doesn't fire twice.
  const toastedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const start = async () => {
      // Mirror useSessionStages: eagerly hand the Realtime client a fresh
      // JWT so the WS upgrade frame carries it. Without this, returning
      // users (INITIAL_SESSION auth event) join anonymous and every
      // postgres_changes payload gets dropped by RLS.
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      channel = supabase
        .channel(`notifications:${profileId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_profile_id=eq.${profileId}`,
          },
          (payload) => {
            if (cancelled) return;
            const next = (payload as unknown as { new?: NotificationRow }).new;
            if (!next) return;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === next.id)) return prev;
              return [next, ...prev];
            });
            if (next.read_at === null && !toastedIdsRef.current.has(next.id)) {
              toastedIdsRef.current.add(next.id);
              setToast(next);
              scheduleToastDismiss();
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_profile_id=eq.${profileId}`,
          },
          (payload) => {
            if (cancelled) return;
            const next = (payload as unknown as { new?: NotificationRow }).new;
            if (!next) return;
            setNotifications((prev) => prev.map((n) => (n.id === next.id ? next : n)));
          },
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED' && !cancelled) {
            setReady(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            // Log but don't fail loudly — the bell + missed-while-offline
            // fallback both keep the user informed even if realtime is down.
            console.warn('[notifications] channel status', status, err);
          }
        });
    };

    void start();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [profileId, scheduleToastDismiss]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id && n.read_at === null ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
  }, []);

  const markAllRead = useCallback(() => {
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.read_at === null ? { ...n, read_at: nowIso } : n)),
    );
  }, []);

  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.read_at === null ? 1 : 0), 0),
    [notifications],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      ready,
      markRead,
      markAllRead,
      toast,
      dismissToast,
      pushToast,
    }),
    [notifications, unreadCount, ready, markRead, markAllRead, toast, dismissToast, pushToast],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
