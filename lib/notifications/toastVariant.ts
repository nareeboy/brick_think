import type { ToastVariant } from '@/components/notifications/Toast';
import type { NotificationKind } from '@/lib/notifications/types';

/**
 * Maps a notification kind to a redesigned-toast variant. Single source of
 * truth shared by the live <NotificationToast> and the /app/admin/toast-test catalog
 * so the two never drift. The default arm matters: `kind` arrives from a
 * realtime payload as a plain string, and rows inserted by overlays or newer
 * servers can carry kinds this build's union hasn't caught up with — those
 * must render as a neutral info toast, not an undefined variant.
 */
export function toastVariantForKind(kind: NotificationKind): ToastVariant {
  switch (kind) {
    case 'session_ended':
      return 'warning';
    case 'org_added':
    case 'participant_joined':
    case 'session_invitation_claimed':
      return 'success';
    case 'session_started':
    default:
      return 'info';
  }
}
