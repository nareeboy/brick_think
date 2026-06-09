import { Font } from '@react-pdf/renderer';

import { CURATED_FONTS, curatedFontFilePath } from '@/lib/branding/curatedFonts';
import { BRAND_ASSETS_BUCKET, type ResolvedBranding } from '@/lib/branding/types';
import { getServiceSupabaseClient } from '@/lib/db/service';

let curatedRegistered = false;
const registeredCustom = new Set<string>();

function registerCurated() {
  if (curatedRegistered) return;
  for (const f of CURATED_FONTS) {
    Font.register({
      family: f.family,
      fonts: f.files.map((file) => ({
        src: curatedFontFilePath(file.rel),
        fontWeight: file.fontWeight,
      })),
    });
  }
  curatedRegistered = true;
}

/**
 * Register every font the report might use. Always registers curated families
 * (covers the null-branding default of Fraunces+Geist). For each custom-font
 * role, downloads the TTF bytes and registers them under the resolved family.
 *
 * @react-pdf's Font.register only accepts a string `src` (file path or URI),
 * not a Node Buffer, so custom fonts are embedded as base64 data URIs.
 */
export async function registerBrandFonts(branding: ResolvedBranding | null): Promise<void> {
  registerCurated();
  if (!branding) return;

  const customFamilies = [branding.headingFamily, branding.bodyFamily].filter(
    (f) => f.startsWith('custom-') && !registeredCustom.has(f),
  );
  if (customFamilies.length === 0) return;

  // Only touch the service client when a custom font actually needs fetching —
  // curated-only branding must render without the Supabase env present.
  const svc = getServiceSupabaseClient();
  for (const family of customFamilies) {
    // family = custom-<profileId>-<role>[-v<version>]
    const m = /^custom-(.+)-(heading|body)(?:-v\d+)?$/.exec(family);
    if (!m) continue;
    const profileId = m[1];
    const role = m[2] as 'heading' | 'body';
    const { data } = await svc
      .from('brand_profiles')
      .select('owner_id')
      .eq('id', profileId)
      .maybeSingle();
    if (!data) continue;
    const ownerId = (data as { owner_id: string }).owner_id;
    const path = `${ownerId}/${profileId}/${role}.ttf`;
    const dl = await svc.storage.from(BRAND_ASSETS_BUCKET).download(path);
    if (!dl.data) continue;
    const buf = Buffer.from(await dl.data.arrayBuffer());
    Font.register({
      family,
      fonts: [{ src: `data:font/ttf;base64,${buf.toString('base64')}`, fontWeight: 400 }],
    });
    registeredCustom.add(family);
  }
}
