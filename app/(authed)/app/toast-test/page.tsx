import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PageBanner } from '@/components/app/PageBanner';
import { isCallerSiteAdmin } from '@/lib/articles/admin';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

import { ToastTestClient } from './ToastTestClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Toast test · BrickThink',
};

export default async function ToastTestPage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Ftoast-test');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Ftoast-test');

  // Dev/QA harness — site admins only. 404 (not 403) so the route isn't
  // discoverable by non-admins.
  if (!(await isCallerSiteAdmin())) notFound();

  return (
    <>
      <PageBanner
        eyebrow="BrickThink"
        title="Toast test"
        subtitle="Fire every in-app notification toast with sample data to check the visual treatment."
        maxWidthClassName="max-w-6xl"
      />
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <ToastTestClient />
      </div>
    </>
  );
}
