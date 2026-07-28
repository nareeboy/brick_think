// app/(authed)/app/admin/webhooks/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import {
  WEBHOOK_DESCRIPTION_MAX,
  isTriggerType,
  isValidDelayDays,
  isValidWebhookType,
  isValidWebhookUrl,
} from '@/lib/webhooks/constants';

type Code =
  | 'forbidden'
  | 'unauthenticated'
  | 'invalid_type'
  | 'invalid_url'
  | 'invalid_trigger'
  | 'invalid_delay'
  | 'invalid_description'
  | 'type_taken'
  | 'not_found'
  | 'unknown';

export type WebhookActionResult = { ok: true } | { ok: false; code: Code };

async function requireAdmin(): Promise<{ userId: string } | WebhookActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };
  const { data, error } = await supabase
    .from('profiles')
    .select('is_site_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data?.is_site_admin) return { ok: false, code: 'forbidden' };
  return { userId: user.id };
}

type ParsedFields =
  | {
      ok: true;
      webhookUrl: string;
      triggerType: string;
      delayDays: number;
      description: string | null;
    }
  | { ok: false; code: Code };

function parseSharedFields(formData: FormData): ParsedFields {
  const urlRaw = formData.get('webhookUrl');
  const webhookUrl = typeof urlRaw === 'string' ? urlRaw.trim() : '';
  if (!isValidWebhookUrl(webhookUrl)) return { ok: false, code: 'invalid_url' };

  const triggerRaw = formData.get('triggerType');
  const triggerType = typeof triggerRaw === 'string' ? triggerRaw : '';
  if (!isTriggerType(triggerType)) return { ok: false, code: 'invalid_trigger' };

  const delayRaw = formData.get('delayDays');
  const delayDays = typeof delayRaw === 'string' && delayRaw.trim() !== '' ? Number(delayRaw) : NaN;
  if (!isValidDelayDays(delayDays)) return { ok: false, code: 'invalid_delay' };

  const descRaw = formData.get('description');
  const description = typeof descRaw === 'string' ? descRaw.trim() : '';
  if (description.length > WEBHOOK_DESCRIPTION_MAX) {
    return { ok: false, code: 'invalid_description' };
  }

  return {
    ok: true,
    webhookUrl,
    triggerType,
    delayDays,
    description: description === '' ? null : description,
  };
}

export async function addWebhookAction(formData: FormData): Promise<WebhookActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;

  const typeRaw = formData.get('webhookType');
  const webhookType = typeof typeRaw === 'string' ? typeRaw.trim() : '';
  if (!isValidWebhookType(webhookType)) return { ok: false, code: 'invalid_type' };

  const fields = parseSharedFields(formData);
  if (!fields.ok) return fields;

  const service = getServiceSupabaseClient();
  const res = await service.from('webhook_configs').insert({
    webhook_type: webhookType,
    webhook_url: fields.webhookUrl,
    trigger_type: fields.triggerType,
    delay_days: fields.delayDays,
    description: fields.description,
    is_active: true,
  });
  if (res.error) {
    return { ok: false, code: res.error.code === '23505' ? 'type_taken' : 'unknown' };
  }

  revalidatePath('/app/admin/webhooks');
  return { ok: true };
}

// webhook_type is immutable after creation — pending deliveries reference it,
// and renaming a type under them would orphan the delete-cleans-queue path.
export async function updateWebhookAction(
  id: string,
  formData: FormData,
): Promise<WebhookActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;

  const fields = parseSharedFields(formData);
  if (!fields.ok) return fields;

  const service = getServiceSupabaseClient();
  const res = await service
    .from('webhook_configs')
    .update({
      webhook_url: fields.webhookUrl,
      trigger_type: fields.triggerType,
      delay_days: fields.delayDays,
      description: fields.description,
    })
    .eq('id', id)
    .select('id');
  if (res.error) return { ok: false, code: 'unknown' };
  if (!res.data || res.data.length === 0) return { ok: false, code: 'not_found' };

  revalidatePath('/app/admin/webhooks');
  return { ok: true };
}

export async function toggleWebhookActiveAction(
  id: string,
  isActive: boolean,
): Promise<WebhookActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;

  const service = getServiceSupabaseClient();
  const res = await service
    .from('webhook_configs')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id');
  if (res.error) return { ok: false, code: 'unknown' };
  if (!res.data || res.data.length === 0) return { ok: false, code: 'not_found' };

  revalidatePath('/app/admin/webhooks');
  return { ok: true };
}

export async function deleteWebhookAction(id: string): Promise<WebhookActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;

  const service = getServiceSupabaseClient();
  const existing = await service
    .from('webhook_configs')
    .select('webhook_type')
    .eq('id', id)
    .maybeSingle();
  if (existing.error) return { ok: false, code: 'unknown' };
  if (!existing.data) return { ok: false, code: 'not_found' };

  // Drop this hook's still-queued deliveries so the processor never posts to
  // a URL the admin just removed; sent rows stay as audit history.
  const pending = await service
    .from('webhook_deliveries')
    .delete()
    .eq('webhook_type', (existing.data as { webhook_type: string }).webhook_type)
    .is('sent_at', null);
  if (pending.error) return { ok: false, code: 'unknown' };

  const res = await service.from('webhook_configs').delete().eq('id', id);
  if (res.error) return { ok: false, code: 'unknown' };

  revalidatePath('/app/admin/webhooks');
  return { ok: true };
}
