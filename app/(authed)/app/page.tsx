import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Builder } from '@/components/builder/Builder';
import { UserBar } from '@/components/builder/UserBar';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

export const metadata: Metadata = {
  title: 'Builder',
};

export const dynamic = 'force-dynamic';

export default async function AppHomePage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp');
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in?next=%2Fapp');
  }

  return <Builder userBar={<UserBar email={user.email} />} />;
}
