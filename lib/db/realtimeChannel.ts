'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';

import { getBrowserSupabaseClient, type BrowserSupabaseClient } from './client';

type ChannelOptions = Parameters<BrowserSupabaseClient['channel']>[1];
type SubscribeStatusCallback = Parameters<RealtimeChannel['subscribe']>[0];

/**
 * Prime the Realtime client with the caller's JWT.
 *
 * Supabase Realtime only calls setAuth on TOKEN_REFRESHED / SIGNED_IN events.
 * When the user already has an active session on page load, auth-js emits
 * INITIAL_SESSION instead — which is NOT handled by SupabaseClient's
 * _handleTokenChanged, so realtime.setAuth is never called and every
 * postgres_changes payload is evaluated as the anon user (silently dropped
 * by RLS). Fix: eagerly fetch the current token and set it on the Realtime
 * client BEFORE creating any channels so the WS join frame carries the JWT.
 *
 * Prefer subscribeAuthedChannel, which owns this ordering; use this directly
 * only for bespoke channel lifecycles (e.g. one-shot broadcasts).
 */
export async function primeRealtimeAuth(
  supabase: BrowserSupabaseClient = getBrowserSupabaseClient(),
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) await supabase.realtime.setAuth(token);
}

export interface AuthedChannelOptions {
  channelKey: string;
  /** Attach `.on(...)` handlers to the fresh channel; return it (chainable). */
  attach: (channel: RealtimeChannel) => RealtimeChannel;
  /** Channel options, e.g. `{ config: { broadcast: { self: false } } }`. */
  channelOptions?: ChannelOptions;
  /** subscribe() status callback — reconnect refetches live here. */
  onStatus?: SubscribeStatusCallback;
  /** Receives the live channel right after subscribe() — for senders. */
  onChannel?: (channel: RealtimeChannel) => void;
}

/**
 * Auth-primed Realtime subscription with the teardown handled.
 *
 * Returns a cleanup function for the caller's useEffect. If the effect is
 * torn down while the token fetch is still in flight, the channel is never
 * created; once created, cleanup removes it.
 */
export function subscribeAuthedChannel({
  channelKey,
  attach,
  channelOptions,
  onStatus,
  onChannel,
}: AuthedChannelOptions): () => void {
  const supabase = getBrowserSupabaseClient();
  let cancelled = false;
  let channel: RealtimeChannel | null = null;

  void (async () => {
    await primeRealtimeAuth(supabase);
    if (cancelled) return;
    channel = attach(supabase.channel(channelKey, channelOptions)).subscribe(onStatus);
    onChannel?.(channel);
  })();

  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}
