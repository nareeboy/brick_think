// Shared branding types. No 'server-only' marker — the FontChoice/validation
// shapes are imported by client editor components; the resolve/byte-reading code
// lives in resolve.ts (service-role only) and is never imported client-side.

/** A font selection for one role (heading or body). */
export type FontChoice = { kind: 'curated'; key: string } | { kind: 'custom'; path: string };

/** Raw row shape as stored in `public.brand_profiles`. */
export interface BrandProfileRow {
  id: string;
  owner_id: string;
  name: string;
  display_name: string;
  footer_contact: string | null;
  brand_colour: string;
  accent_colour: string;
  logo_path: string | null;
  heading_font: FontChoice;
  body_font: FontChoice;
  created_at: string;
  updated_at: string;
}

/** What the editor list/preview needs (no bytes). */
export interface BrandProfileSummary {
  id: string;
  name: string;
  displayName: string;
  footerContact: string | null;
  brandColour: string;
  accentColour: string;
  logoUrl: string | null; // signed URL for preview, null if no logo
  headingFont: FontChoice;
  bodyFont: FontChoice;
}

/**
 * Fully resolved branding handed to the PDF renderer. Font families are the
 * @react-pdf family names registered in registerBrandFonts(); logo is raw PNG
 * bytes as a data URI (react-pdf embeds data URIs directly).
 */
export interface ResolvedBranding {
  displayName: string;
  footerContact: string | null;
  brandColour: string;
  accentColour: string;
  /** Ink colour to use on the brand-colour cover background: '#000' or '#fff'. */
  coverInk: string;
  logoDataUri: string | null;
  headingFamily: string;
  bodyFamily: string;
}

export const BRAND_NAME_MAX = 80;
export const BRAND_FOOTER_MAX = 160;
export const BRAND_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const BRAND_FONT_MAX_BYTES = 2 * 1024 * 1024;
export const MAX_BRAND_PROFILES_PER_OWNER = 10;
export const BRAND_ASSETS_BUCKET = 'brand-assets';
