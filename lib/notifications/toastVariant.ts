import type { ToastVariant } from '@/components/notifications/Toast';
import type { NotificationKind } from '@/lib/notifications/types';

/**
 * Maps a notification kind to a redesigned-toast variant. Single source of
 * truth shared by the live <NotificationToast> and the /app/toast-test catalog
 * so the two never drift. The switch is exhaustive over NotificationKind —
 * adding a kind without a case is a compile error.
 */
export function toastVariantForKind(kind: NotificationKind): ToastVariant {
  switch (kind) {
    case 'session_ended':
      return 'warning';
    case 'session_started':
      return 'info';
    case 'org_added':
    case 'participant_joined':
    case 'session_invitation_claimed':
      return 'success';
  }
}
