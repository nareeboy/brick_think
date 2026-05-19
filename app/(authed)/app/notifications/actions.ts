'use server';

import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/db/server';
import type { NotificationRow } from '@/lib/notifications/types';

async function requireUserId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp');
  return user.id;
}

/**
 * Mark a single notification read. RLS already gates this to the recipient
 * (the UPDATE policy on public.notifications restricts both USING and WITH
 * CHECK to `recipient_profile_id = auth.uid()`), so no extra ownership check
 * is needed here — the .eq('id', ...) is enough.
 */
export async function markNotificationReadAction(notificationId: string): Promise<void> {
  await requireUserId();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null);
  if (error) {
    console.error('markNotificationReadAction failed', error);
  }
}

/**
 * Mark every unread notification for the current user as read.
 */
export async function markAllNotificationsReadAction(): Promise<void> {
  const userId = await requireUserId();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_profile_id', userId)
    .is('read_at', null);
  if (error) {
    console.error('markAllNotificationsReadAction failed', error);
  }
}

/**
 * Fetch the recipient's recent notifications (most recent first). Used by
 * the NotificationsProvider's initial hydration on the client.
 */
export async function fetchRecentNotifications(limit = 20): Promise<NotificationRow[]> {
  const userId = await requireUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, recipient_profile_id, kind, title, body, link_url, actor_profile_id, org_id, session_id, read_at, created_at',
    )
    .eq('recipient_profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('fetchRecentNotifications failed', error);
    return [];
  }
  return (data ?? []) as unknown as NotificationRow[];
}
