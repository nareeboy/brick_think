// Shared server-action mock surface for the integration suite.
//
// setup.ts registers vi.mock('next/cache' | 'next/navigation' | 'next/headers'
// | '@/lib/db/server') with the factories below, so individual test files no
// longer carry the copy-pasted preamble. Test files drive the mocked
// createServerSupabaseClient through setActionClient():
//
//   setActionClient(client)  — actions run as this signed-in Supabase client
//   setActionClient('anon')  — actions run unauthenticated (fresh anon client
//                              per call, mimicking a cookie-less request)
//   setActionClient(null)    — unset; an action call is a test bug and throws
//
// Vitest isolates test files, so this module's state starts null in every
// file — a file that forgets to set it fails loudly instead of leaking
// another file's identity.

import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

type ActionClient = SupabaseClient | 'anon' | null;

let currentClient: ActionClient = null;

export function setActionClient(client: ActionClient): void {
  currentClient = client;
}

/** URLs passed to next/navigation's redirect() by the code under test. */
export const capturedRedirects: string[] = [];

export function nextCacheMock() {
  return { revalidatePath: vi.fn() };
}

export function nextNavigationMock() {
  return {
    // Match Next's real behaviour: redirect() throws so the action stops
    // executing. Tests assert on the sentinel or on capturedRedirects.
    redirect: (url?: string) => {
      capturedRedirects.push(url ?? '');
      throw new Error(`__redirect__:${url ?? ''}`);
    },
  };
}

export function nextHeadersMock() {
  return {
    // Outside a request scope the real next/headers throws; serve a
    // local-dev-shaped Headers so origin derivation (publicOriginFromHeaders)
    // works in actions that send emails.
    headers: async () => new Headers({ host: 'localhost:3000' }),
  };
}

export async function dbServerMock() {
  const { makeAnonClient } = await import('@/lib/testing/supabase-test-client');
  return {
    createServerSupabaseClient: vi.fn(async () => {
      if (currentClient === 'anon') return makeAnonClient();
      if (!currentClient) {
        throw new Error('Test bug: setActionClient() not called before invoking an action');
      }
      return currentClient;
    }),
  };
}
