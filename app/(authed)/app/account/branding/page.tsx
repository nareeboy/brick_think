import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { entitledTier, hasTierRank } from '@/lib/billing/entitlements';
import { CURATED_FONTS } from '@/lib/branding/curatedFonts';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

import { listBrandProfiles } from './actions';
import { BrandProfilesManager } from './BrandProfilesManager';

export const metadata: Metadata = { title: 'Brand presets' };
export const dynamic = 'force-dynamic';

export default async function BrandingPage() {
  if (!isSupabaseConfigured()) redirect('/sign-in?next=%2Fapp%2Faccount%2Fbranding');
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount%2Fbranding');

  const tier = await entitledTier(user.id);
  const entitled = hasTierRank(tier, 'client_ready');
  const profiles = await listBrandProfiles();
  const fontOptions = CURATED_FONTS.map((f) => ({ key: f.key, label: f.label }));

  return (
    <div className="mx-auto max-w-[900px] px-5 py-10">
      <Link
        href="/app/account"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-600 transition-colors hover:text-zinc-900"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to settings
      </Link>
      <h1 className="mt-4 font-display text-2xl text-zinc-900">Brand presets</h1>
      <p className="mt-2 max-w-prose text-sm text-zinc-600">
        White-label your PDF reports — your logo, colours, fonts and name. Pick a preset when you
        generate a report. {entitled ? null : 'Branded reports are part of the Client-Ready plan.'}
      </p>
      <div className="mt-6">
        <BrandProfilesManager
          initialProfiles={profiles}
          entitled={entitled}
          fontOptions={fontOptions}
        />
      </div>
    </div>
  );
}
