// Verifies the admin webhooks feature end-to-end against the local stack:
//   * RLS — non-admins can neither read nor write webhook_configs /
//     webhook_deliveries (reads filter silently, writes error); site admins
//     can read via the user-scoped client.
//   * Signup trigger — creating a user fires trg_queue_signup_webhooks:
//     an immediate (delay 0) signup config produces a delivery row that is
//     already sent; a delayed config produces a queued row ~N days out.
//     Inactive and manual configs produce nothing.
//   * process_due_webhook_deliveries() — posts due queued rows and stamps
//     sent_at.
//   * Server actions — add/update/toggle/delete happy paths + validation
//     codes + the non-admin `forbidden` gate; delete clears that hook's
//     pending deliveries but keeps sent audit rows.
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

let currentClient: SupabaseClient | null = null;
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set');
    return currentClient;
  }),
}));

// Import AFTER the mocks so requireAdmin resolves through them.
import {
  addWebhookAction,
  deleteWebhookAction,
  toggleWebhookActiveAction,
  updateWebhookAction,
} from '@/app/(authed)/app/admin/webhooks/actions';

const admin = getAdminClient();
// Unique per run so parallel/leftover rows never collide.
const RUN = randomUUID().slice(0, 8);
const TYPE_NOW = `it_now_${RUN}`;
const TYPE_DELAYED = `it_day3_${RUN}`;
const TYPE_INACTIVE = `it_off_${RUN}`;
const TYPE_MANUAL = `it_manual_${RUN}`;
// .invalid TLD: guaranteed non-resolving, so pg_net's async post just fails
// out-of-band without touching anything real.
const HOOK_URL = 'https://webhooks.invalid/brickthink-test';

let adminUser: TestUser;
let plainUser: TestUser;

async function seedConfig(type: string, overrides: Record<string, unknown> = {}): Promise<void> {
  const res = await admin.from('webhook_configs').insert({
    webhook_type: type,
    webhook_url: HOOK_URL,
    trigger_type: 'signup',
    delay_days: 0,
    is_active: true,
    ...overrides,
  });
  if (res.error) throw new Error(`seed ${type} failed: ${res.error.message}`);
}

async function cleanupRunRows(): Promise<void> {
  await admin.from('webhook_deliveries').delete().like('webhook_type', `it_%_${RUN}`);
  await admin.from('webhook_configs').delete().like('webhook_type', `it_%_${RUN}`);
}

beforeAll(async () => {
  adminUser = await createTestUser();
  plainUser = await createTestUser();
  const flip = await admin.from('profiles').update({ is_site_admin: true }).eq('id', adminUser.id);
  if (flip.error) throw new Error(`Could not flip is_site_admin: ${flip.error.message}`);
});

afterAll(async () => {
  await cleanupRunRows();
  await cleanupTestUser(adminUser.id);
  await cleanupTestUser(plainUser.id);
});

describe('RLS', () => {
  it('hides configs and deliveries from non-admins and blocks their writes', async () => {
    await seedConfig(TYPE_NOW, { is_active: false });
    try {
      const asPlain = await signInAs(plainUser);

      const read = await asPlain.from('webhook_configs').select('id');
      expect(read.error).toBeNull();
      expect(read.data).toEqual([]);

      const readDeliveries = await asPlain.from('webhook_deliveries').select('id');
      expect(readDeliveries.error).toBeNull();
      expect(readDeliveries.data).toEqual([]);

      const write = await asPlain.from('webhook_configs').insert({
        webhook_type: `it_sneaky_${RUN}`,
        webhook_url: HOOK_URL,
      });
      expect(write.error).not.toBeNull();
    } finally {
      await cleanupRunRows();
    }
  });

  it('lets site admins read configs through the user-scoped client', async () => {
    await seedConfig(TYPE_NOW, { is_active: false });
    try {
      const asAdmin = await signInAs(adminUser);
      const read = await asAdmin
        .from('webhook_configs')
        .select('webhook_type')
        .eq('webhook_type', TYPE_NOW);
      expect(read.error).toBeNull();
      expect(read.data).toHaveLength(1);
    } finally {
      await cleanupRunRows();
    }
  });
});

describe('signup trigger', () => {
  it('fires immediate hooks, queues delayed hooks, skips inactive and manual', async () => {
    await seedConfig(TYPE_NOW);
    await seedConfig(TYPE_DELAYED, { delay_days: 3 });
    await seedConfig(TYPE_INACTIVE, { is_active: false });
    await seedConfig(TYPE_MANUAL, { trigger_type: 'manual' });

    let signupUser: TestUser | null = null;
    try {
      signupUser = await createTestUser();

      const { data, error } = await admin
        .from('webhook_deliveries')
        .select('webhook_type, email, scheduled_for, sent_at')
        .eq('profile_id', signupUser.id);
      expect(error).toBeNull();
      const rows = data ?? [];
      expect(rows.map((r) => r.webhook_type).sort()).toEqual([TYPE_DELAYED, TYPE_NOW].sort());

      const immediate = rows.find((r) => r.webhook_type === TYPE_NOW);
      expect(immediate?.sent_at).not.toBeNull();
      expect(immediate?.email).toBe(signupUser.email);

      const delayed = rows.find((r) => r.webhook_type === TYPE_DELAYED);
      expect(delayed?.sent_at).toBeNull();
      const expectedMs = Date.now() + 3 * 24 * 60 * 60 * 1000;
      const actualMs = new Date(delayed?.scheduled_for as string).getTime();
      expect(Math.abs(actualMs - expectedMs)).toBeLessThan(5 * 60 * 1000);
    } finally {
      if (signupUser) await cleanupTestUser(signupUser.id);
      await cleanupRunRows();
    }
  });

  it('does not re-fire for existing users when their profile is updated', async () => {
    let signupUser: TestUser | null = null;
    try {
      signupUser = await createTestUser();
      await seedConfig(TYPE_NOW);

      const touch = await admin
        .from('profiles')
        .update({ full_name: 'Updated Name' })
        .eq('id', signupUser.id);
      expect(touch.error).toBeNull();

      const { data } = await admin
        .from('webhook_deliveries')
        .select('id')
        .eq('profile_id', signupUser.id);
      // Config was seeded after the user existed; the profile UPDATE above
      // must not fire the INSERT-only trigger.
      expect(data).toEqual([]);
    } finally {
      if (signupUser) await cleanupTestUser(signupUser.id);
      await cleanupRunRows();
    }
  });
});

describe('process_due_webhook_deliveries', () => {
  it('posts due rows and stamps sent_at, leaving future rows queued', async () => {
    let signupUser: TestUser | null = null;
    try {
      signupUser = await createTestUser();
      const past = new Date(Date.now() - 60 * 1000).toISOString();
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const seed = await admin.from('webhook_deliveries').insert([
        {
          profile_id: signupUser.id,
          email: signupUser.email,
          webhook_type: TYPE_DELAYED,
          webhook_url: HOOK_URL,
          scheduled_for: past,
        },
        {
          profile_id: signupUser.id,
          email: signupUser.email,
          webhook_type: TYPE_DELAYED,
          webhook_url: HOOK_URL,
          scheduled_for: future,
        },
      ]);
      expect(seed.error).toBeNull();

      const run = await admin.rpc('process_due_webhook_deliveries');
      expect(run.error).toBeNull();

      const { data } = await admin
        .from('webhook_deliveries')
        .select('scheduled_for, sent_at')
        .eq('profile_id', signupUser.id)
        .eq('webhook_type', TYPE_DELAYED);
      const dueRow = data?.find((r) => r.scheduled_for === past || r.sent_at !== null);
      const futureRow = data?.find((r) => r.sent_at === null);
      expect(dueRow?.sent_at).not.toBeNull();
      expect(futureRow).toBeDefined();
    } finally {
      if (signupUser) await cleanupTestUser(signupUser.id);
      await cleanupRunRows();
    }
  });
});

describe('server actions', () => {
  function formOf(fields: Record<string, string>): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    return form;
  }

  it('rejects non-admin callers', async () => {
    currentClient = await signInAs(plainUser);
    const result = await addWebhookAction(
      formOf({
        webhookType: TYPE_NOW,
        webhookUrl: HOOK_URL,
        triggerType: 'signup',
        delayDays: '0',
      }),
    );
    expect(result).toEqual({ ok: false, code: 'forbidden' });
  });

  it('validates fields before writing', async () => {
    currentClient = await signInAs(adminUser);
    const base = {
      webhookType: TYPE_NOW,
      webhookUrl: HOOK_URL,
      triggerType: 'signup',
      delayDays: '0',
    };
    expect(await addWebhookAction(formOf({ ...base, webhookType: ' ' }))).toEqual({
      ok: false,
      code: 'invalid_type',
    });
    expect(
      await addWebhookAction(formOf({ ...base, webhookUrl: 'http://insecure.example' })),
    ).toEqual({ ok: false, code: 'invalid_url' });
    expect(await addWebhookAction(formOf({ ...base, triggerType: 'subscription' }))).toEqual({
      ok: false,
      code: 'invalid_trigger',
    });
    expect(await addWebhookAction(formOf({ ...base, delayDays: '1.5' }))).toEqual({
      ok: false,
      code: 'invalid_delay',
    });
  });

  it('adds, rejects duplicates, updates, toggles, and deletes', async () => {
    currentClient = await signInAs(adminUser);
    try {
      const added = await addWebhookAction(
        formOf({
          webhookType: TYPE_NOW,
          webhookUrl: HOOK_URL,
          triggerType: 'signup',
          delayDays: '0',
          description: 'integration test hook',
        }),
      );
      expect(added).toEqual({ ok: true });

      const dupe = await addWebhookAction(
        formOf({
          webhookType: TYPE_NOW,
          webhookUrl: HOOK_URL,
          triggerType: 'signup',
          delayDays: '0',
        }),
      );
      expect(dupe).toEqual({ ok: false, code: 'type_taken' });

      const { data: row } = await admin
        .from('webhook_configs')
        .select('id, is_active')
        .eq('webhook_type', TYPE_NOW)
        .single();
      const id = (row as { id: string }).id;

      expect(
        await updateWebhookAction(
          id,
          formOf({ webhookUrl: HOOK_URL, triggerType: 'signup', delayDays: '7' }),
        ),
      ).toEqual({ ok: true });
      const { data: updated } = await admin
        .from('webhook_configs')
        .select('delay_days, description')
        .eq('id', id)
        .single();
      expect((updated as { delay_days: number }).delay_days).toBe(7);
      // Empty description field clears it.
      expect((updated as { description: string | null }).description).toBeNull();

      expect(await toggleWebhookActiveAction(id, false)).toEqual({ ok: true });
      const { data: toggled } = await admin
        .from('webhook_configs')
        .select('is_active')
        .eq('id', id)
        .single();
      expect((toggled as { is_active: boolean }).is_active).toBe(false);

      // Seed one pending + one sent delivery for this type, then delete: the
      // pending row must go, the sent row must survive as audit history.
      const seeded = await admin.from('webhook_deliveries').insert([
        {
          email: 'pending@brick-think.test',
          webhook_type: TYPE_NOW,
          webhook_url: HOOK_URL,
          scheduled_for: new Date(Date.now() + 3600_000).toISOString(),
        },
        {
          email: 'sent@brick-think.test',
          webhook_type: TYPE_NOW,
          webhook_url: HOOK_URL,
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        },
      ]);
      expect(seeded.error).toBeNull();

      expect(await deleteWebhookAction(id)).toEqual({ ok: true });
      const { data: gone } = await admin.from('webhook_configs').select('id').eq('id', id);
      expect(gone).toEqual([]);
      const { data: remaining } = await admin
        .from('webhook_deliveries')
        .select('email, sent_at')
        .eq('webhook_type', TYPE_NOW);
      expect(remaining).toHaveLength(1);
      expect((remaining?.[0] as { sent_at: string | null }).sent_at).not.toBeNull();

      expect(await deleteWebhookAction(id)).toEqual({ ok: false, code: 'not_found' });
    } finally {
      await cleanupRunRows();
    }
  });
});
