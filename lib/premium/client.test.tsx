import { describe, expect, it } from 'vitest';

import { ReportActionsSlot } from './client';

describe('ReportActionsSlot (open-core stub)', () => {
  it('renders nothing — the open core has no report feature', () => {
    expect(ReportActionsSlot({ sessionId: '00000000-0000-0000-0000-000000000000' })).toBeNull();
  });
});
