'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/db/server';

function safeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') return '/app/my-designs';
  return value.startsWith('/') ? value : '/app/my-designs';
}

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

export interface SignInState {
  message: string;
  ok: boolean;
}

export async function sendMagicLink(
  _previous: SignInState | null,
  formData: FormData,
): Promise<SignInState> {
  const email = formData.get('email');
  const next = safeNext(formData.get('next'));

  if (typeof email !== 'string' || !email.includes('@')) {
    return { ok: false, message: 'Enter a valid email address.' };
  }

  const supabase = await createServerSupabaseClient();
  const origin = await originFromHeaders();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: `Sign-in link sent to ${email}. Check your inbox to continue.`,
  };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNext(formData.get('next'));
  const supabase = await createServerSupabaseClient();
  const origin = await originFromHeaders();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });

  if (error || !data.url) {
    redirect(`/sign-in?error=${encodeURIComponent(error?.message ?? 'OAuth start failed')}`);
  }

  redirect(data.url);
}
