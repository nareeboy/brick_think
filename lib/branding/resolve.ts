import 'server-only';

import { getServiceSupabaseClient } from '@/lib/db/service';

import { inkOn } from './contrast';
import { CURATED_FONTS, curatedFontByKey } from './curatedFonts';
import { BRAND_ASSETS_BUCKET, type BrandProfileRow, type ResolvedBranding } from './types';

/**
 * Resolve a brand preset into render-ready branding. Service-role byte reads.
 * Returns null if the preset doesn't exist or isn't owned by ownerId.
 *
 * Font family resolution:
 *  - curated → the catalog family name (registerBrandFonts loads it from disk)
 *  - custom  → a per-preset, versioned family name "custom-<id>-heading|body-v<ts>";
 *    the version (updated_at epoch ms) busts @react-pdf's family cache on re-upload.
 *    The bytes are not needed here (registerBrandFonts fetches them) — only the name.
 */
export async function resolveBranding(
  brandProfileId: string,
  ownerId: string,
): Promise<ResolvedBranding | null> {
  const svc = getServiceSupabaseClient();
  const { data, error } = await svc
    .from('brand_profiles')
    .select(
      'id, owner_id, display_name, footer_contact, brand_colour, accent_colour, logo_path, heading_font, body_font, updated_at',
    )
    .eq('id', brandProfileId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as BrandProfileRow;
  if (row.owner_id !== ownerId) return null;

  // Version token busts @react-pdf's family-name cache when a custom font is
  // re-uploaded to the same preset+role (the DB trigger bumps updated_at).
  const version = String(new Date(row.updated_at).getTime());

  let logoDataUri: string | null = null;
  if (row.logo_path) {
    const dl = await svc.storage.from(BRAND_ASSETS_BUCKET).download(row.logo_path);
    if (dl.data) {
      const buf = Buffer.from(await dl.data.arrayBuffer());
      logoDataUri = `data:image/png;base64,${buf.toString('base64')}`;
    }
  }

  return {
    displayName: row.display_name,
    footerContact: row.footer_contact,
    brandColour: row.brand_colour,
    accentColour: row.accent_colour,
    coverInk: inkOn(row.brand_colour),
    logoDataUri,
    headingFamily: familyForChoice(row.heading_font, row.id, 'heading', version),
    bodyFamily: familyForChoice(row.body_font, row.id, 'body', version),
  };
}

function familyForChoice(
  choice: BrandProfileRow['heading_font'],
  profileId: string,
  role: 'heading' | 'body',
  version: string,
): string {
  if (choice.kind === 'curated') {
    return curatedFontByKey(choice.key)?.family ?? CURATED_FONTS[0]?.family ?? 'Helvetica';
  }
  return `custom-${profileId}-${role}-v${version}`;
}
