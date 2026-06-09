'use client';

import Link from 'next/link';

import { Toast } from '@/components/notifications/Toast';
import { useNotifications } from '@/components/notifications/NotificationsProvider';
import { toastVariantForKind } from '@/lib/notifications/toastVariant';

/**
 * Transient toast for the authed app. Fires when NotificationsProvider receives
 * a Realtime INSERT for the current user, on first mount via the
 * missed-while-offline fallback, or when a server action calls `pushToast()`
 * (admin-side confirmations). Renders the redesigned <Toast> in the top-right,
 * sliding in from the right; the notification's `kind` selects the variant.
 */
export function NotificationToast() {
  const { toast, dismissToast } = useNotifications();
  if (!toast) return null;

  const card = (
    <Toast
      variant={toastVariantForKind(toast.kind)}
      title={toast.title}
      description={toast.body ?? undefined}
      onDismiss={dismissToast}
      className="animate-toast-in pointer-events-auto w-[min(34rem,calc(100vw-2rem))]"
    />
  );

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-40 flex justify-end"
      data-testid="notification-toast"
    >
      {toast.link_url ? (
        <Link
          href={toast.link_url}
          onClick={dismissToast}
          className="pointer-events-auto contents"
          data-testid="notification-toast-link"
        >
          {card}
        </Link>
      ) : (
        card
      )}
    </div>
  );
}
