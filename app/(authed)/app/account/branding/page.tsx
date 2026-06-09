import type { Metadata } from 'next';
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
      <h1 className="font-display text-2xl text-zinc-900">Brand presets</h1>
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
