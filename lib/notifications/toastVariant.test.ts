import { describe, expect, it } from 'vitest';

import type { NotificationKind } from '@/lib/notifications/types';
import { toastVariantForKind } from './toastVariant';

describe('toastVariantForKind', () => {
  it('maps every known kind to its variant', () => {
    expect(toastVariantForKind('session_ended')).toBe('warning');
    expect(toastVariantForKind('session_started')).toBe('info');
    expect(toastVariantForKind('org_added')).toBe('success');
    expect(toastVariantForKind('participant_joined')).toBe('success');
    expect(toastVariantForKind('session_invitation_claimed')).toBe('success');
  });

  it('falls back to info for kinds this build does not know', () => {
    // Overlays and newer servers can insert kinds the core union hasn't
    // caught up with — the realtime payload arrives as a plain string.
    expect(toastVariantForKind('report_ready' as NotificationKind)).toBe('info');
  });
});
