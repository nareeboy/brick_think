import { describe, expect, it } from 'vitest';

import {
  AccountNavSlot,
  AdminNavSlot,
  AssistantEntrySlot,
  BrandingSettingsSlot,
  ChatWidgetSlot,
  HeaderPlanSlot,
  ReportActionsSlot,
} from './server-slots';

describe('server-rendered slot stubs', () => {
  it('ReportActionsSlot renders nothing even when the caller can manage', () => {
    expect(
      ReportActionsSlot({ sessionId: '00000000-0000-0000-0000-000000000000', canManage: true }),
    ).toBeNull();
  });

  it('nav and branding slots render nothing on the open core', () => {
    expect(BrandingSettingsSlot({})).toBeNull();
    expect(AccountNavSlot({})).toBeNull();
    expect(AdminNavSlot({})).toBeNull();
  });

  it('ChatWidgetSlot renders nothing on the open core', () => {
    expect(ChatWidgetSlot({ profileId: '00000000-0000-0000-0000-000000000000' })).toBeNull();
  });

  it('HeaderPlanSlot renders nothing on the open core', () => {
    expect(HeaderPlanSlot({ profileId: '00000000-0000-0000-0000-000000000000' })).toBeNull();
  });

  it('AssistantEntrySlot renders nothing on the open core', () => {
    expect(AssistantEntrySlot({ profileId: '00000000-0000-0000-0000-000000000000' })).toBeNull();
  });
});
