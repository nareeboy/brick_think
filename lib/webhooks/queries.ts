import 'server-only';

import { isCallerSiteAdmin } from '@/lib/articles/admin';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { isTriggerType } from './constants';
import type { WebhookConfig, WebhookDelivery } from './types';

const RECENT_DELIVERIES_LIMIT = 20;

type ConfigRow = {
  id: string;
  webhook_type: string;
  webhook_url: string;
  trigger_type: string;
  delay_days: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

type DeliveryRow = {
  id: string;
  email: string;
  webhook_type: string;
  scheduled_for: string;
  sent_at: string | null;
  error_message: string | null;
};

/** All configured webhooks, immediate first. Null when caller isn't a site admin. */
export async function listWebhookConfigs(): Promise<WebhookConfig[] | null> {
  if (!(await isCallerSiteAdmin())) return null;
  const service = getServiceSupabaseClient();

  const { data, error } = await service
    .from('webhook_configs')
    .select(
      'id, webhook_type, webhook_url, trigger_type, delay_days, description, is_active, created_at',
    )
    .order('delay_days', { ascending: true })
    .order('webhook_type', { ascending: true });
  if (error) throw new Error(`webhook_configs read failed: ${error.message}`);

  return ((data ?? []) as ConfigRow[]).map((row) => ({
    id: row.id,
    webhookType: row.webhook_type,
    webhookUrl: row.webhook_url,
    triggerType: isTriggerType(row.trigger_type) ? row.trigger_type : 'manual',
    delayDays: row.delay_days,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

/** Latest delivery rows (sent + still queued). Null when caller isn't a site admin. */
export async function listRecentWebhookDeliveries(): Promise<WebhookDelivery[] | null> {
  if (!(await isCallerSiteAdmin())) return null;
  const service = getServiceSupabaseClient();

  const { data, error } = await service
    .from('webhook_deliveries')
    .select('id, email, webhook_type, scheduled_for, sent_at, error_message')
    .order('created_at', { ascending: false })
    .limit(RECENT_DELIVERIES_LIMIT);
  if (error) throw new Error(`webhook_deliveries read failed: ${error.message}`);

  return ((data ?? []) as DeliveryRow[]).map((row) => ({
    id: row.id,
    email: row.email,
    webhookType: row.webhook_type,
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at,
    errorMessage: row.error_message,
  }));
}
