'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  BRAND_ASSETS_BUCKET,
  BRAND_FONT_MAX_BYTES,
  BRAND_LOGO_MAX_BYTES,
  type BrandProfileSummary,
  type FontChoice,
  MAX_BRAND_PROFILES_PER_OWNER,
} from '@/lib/branding/types';
import {
  isValidFontChoice,
  isValidFooter,
  isValidHexColour,
  isValidName,
} from '@/lib/branding/validate';
import { isTtf } from '@/lib/branding/validateTtf';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { Json } from '@/lib/db/types.generated';
import { isPng } from '@/lib/images/validatePng';

const SIGNED_URL_TTL = 60 * 60;

export type BrandActionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code:
        | 'unauthenticated'
        | 'invalid_name'
        | 'invalid_display_name'
        | 'invalid_footer'
        | 'invalid_colour'
        | 'invalid_font'
        | 'limit_reached'
        | 'not_found'
        | 'invalid_logo'
        | 'invalid_font_file'
        | 'storage_failed'
        | 'db_failed';
      message?: string;
    };

interface BrandInput {
  name: string;
  displayName: string;
  footerContact: string | null;
  brandColour: string;
  accentColour: string;
  headingFont: FontChoice;
  bodyFont: FontChoice;
}

function validate(input: BrandInput): BrandActionResult | null {
  if (!isValidName(input.name)) return { ok: false, code: 'invalid_name' };
  if (!isValidName(input.displayName)) return { ok: false, code: 'invalid_display_name' };
  if (!isValidFooter(input.footerContact)) return { ok: false, code: 'invalid_footer' };
  if (!isValidHexColour(input.brandColour) || !isValidHexColour(input.accentColour))
    return { ok: false, code: 'invalid_colour' };
  if (!isValidFontChoice(input.headingFont) || !isValidFontChoice(input.bodyFont))
    return { ok: false, code: 'invalid_font' };
  return null;
}

export async function createBrandProfileAction(input: BrandInput): Promise<BrandActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const invalid = validate(input);
  if (invalid) return invalid;

  const { count } = await supabase
    .from('brand_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id);
  if ((count ?? 0) >= MAX_BRAND_PROFILES_PER_OWNER) return { ok: false, code: 'limit_reached' };

  const ins = await supabase
    .from('brand_profiles')
    .insert({
      owner_id: user.id,
      name: input.name.trim(),
      display_name: input.displayName.trim(),
      footer_contact: input.footerContact?.trim() || null,
      brand_colour: input.brandColour,
      accent_colour: input.accentColour,
      heading_font: input.headingFont as unknown as Json,
      body_font: input.bodyFont as unknown as Json,
    })
    .select('id')
    .single();
  if (ins.error || !ins.data) return { ok: false, code: 'db_failed', message: ins.error?.message };

  revalidatePath('/app/account/branding');
  return { ok: true, id: ins.data.id };
}

export async function updateBrandProfileAction(
  id: string,
  input: BrandInput,
): Promise<BrandActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const invalid = validate(input);
  if (invalid) return invalid;

  const upd = await supabase
    .from('brand_profiles')
    .update({
      name: input.name.trim(),
      display_name: input.displayName.trim(),
      footer_contact: input.footerContact?.trim() || null,
      brand_colour: input.brandColour,
      accent_colour: input.accentColour,
      heading_font: input.headingFont as unknown as Json,
      body_font: input.bodyFont as unknown as Json,
    })
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('id')
    .single();
  if (upd.error || !upd.data) return { ok: false, code: 'not_found', message: upd.error?.message };

  revalidatePath('/app/account/branding');
  return { ok: true, id };
}

export async function deleteBrandProfileAction(id: string): Promise<BrandActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const prefix = `${user.id}/${id}`;
  const list = await supabase.storage.from(BRAND_ASSETS_BUCKET).list(prefix);
  if (list.data && list.data.length > 0) {
    // Log-but-continue: a storage removal failure shouldn't block the row
    // delete (matches removeAvatarAction's posture).
    const removeResult = await supabase.storage
      .from(BRAND_ASSETS_BUCKET)
      .remove(list.data.map((f) => `${prefix}/${f.name}`));
    if (removeResult.error) {
      console.warn('brand asset storage removal failed (continuing):', removeResult.error.message);
    }
  }

  const del = await supabase
    .from('brand_profiles')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('id')
    .single();
  if (del.error || !del.data) return { ok: false, code: 'not_found', message: del.error?.message };

  revalidatePath('/app/account/branding');
  return { ok: true, id };
}

export async function uploadBrandLogoAction(
  id: string,
  formData: FormData,
): Promise<BrandActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const raw = formData.get('logo');
  if (!(raw instanceof Blob)) {
    console.warn('logo rejected: not a Blob', { type: typeof raw });
    return { ok: false, code: 'invalid_logo' };
  }
  if (raw.type !== 'image/png' || raw.size === 0 || raw.size > BRAND_LOGO_MAX_BYTES) {
    console.warn('logo rejected: bad MIME or size out of range', {
      mime: raw.type,
      size: raw.size,
    });
    return { ok: false, code: 'invalid_logo' };
  }
  if (!(await isPng(raw))) {
    console.warn('logo rejected: PNG magic-byte check failed', { mime: raw.type, size: raw.size });
    return { ok: false, code: 'invalid_logo' };
  }

  const path = `${user.id}/${id}/logo.png`;
  const up = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .upload(path, raw, { upsert: true, contentType: 'image/png', cacheControl: '0' });
  if (up.error) return { ok: false, code: 'storage_failed', message: up.error.message };

  const upd = await supabase
    .from('brand_profiles')
    .update({ logo_path: path })
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('id')
    .single();
  if (upd.error || !upd.data) return { ok: false, code: 'not_found' };

  revalidatePath('/app/account/branding');
  return { ok: true, id };
}

export async function uploadBrandFontAction(
  id: string,
  role: 'heading' | 'body',
  formData: FormData,
): Promise<BrandActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const raw = formData.get('font');
  if (!(raw instanceof Blob) || raw.size === 0 || raw.size > BRAND_FONT_MAX_BYTES) {
    console.warn('font rejected: not a Blob or size out of range', {
      size: raw instanceof Blob ? raw.size : undefined,
    });
    return { ok: false, code: 'invalid_font_file' };
  }
  if (!(await isTtf(raw))) {
    console.warn('font rejected: TTF magic-byte check failed', { size: raw.size });
    return { ok: false, code: 'invalid_font_file' };
  }

  const path = `${user.id}/${id}/${role}.ttf`;
  const up = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .upload(path, raw, { upsert: true, contentType: 'font/ttf', cacheControl: '0' });
  if (up.error) return { ok: false, code: 'storage_failed', message: up.error.message };

  const fontChoice: FontChoice = { kind: 'custom', path };
  // Explicit branch rather than a computed key so the update payload narrows
  // against the generated row type instead of widening to a string index.
  const query = supabase.from('brand_profiles');
  const upd =
    role === 'heading'
      ? await query
          .update({ heading_font: fontChoice as unknown as Json })
          .eq('id', id)
          .eq('owner_id', user.id)
          .select('id')
          .single()
      : await query
          .update({ body_font: fontChoice as unknown as Json })
          .eq('id', id)
          .eq('owner_id', user.id)
          .select('id')
          .single();
  if (upd.error || !upd.data) return { ok: false, code: 'not_found' };

  revalidatePath('/app/account/branding');
  return { ok: true, id };
}

export async function listBrandProfiles(): Promise<BrandProfileSummary[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount%2Fbranding');

  const { data, error } = await supabase
    .from('brand_profiles')
    .select(
      'id, name, display_name, footer_contact, brand_colour, accent_colour, logo_path, heading_font, body_font',
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  // Sign a private brand-assets object path; null on missing path or failure.
  const sign = async (path: string | null | undefined): Promise<string | null> => {
    if (!path) return null;
    const signed = await supabase.storage
      .from(BRAND_ASSETS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    return signed.data?.signedUrl ?? null;
  };

  const out: BrandProfileSummary[] = [];
  for (const row of data) {
    const headingFont = row.heading_font as unknown as FontChoice;
    const bodyFont = row.body_font as unknown as FontChoice;
    out.push({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      footerContact: row.footer_contact,
      brandColour: row.brand_colour,
      accentColour: row.accent_colour,
      logoUrl: await sign(row.logo_path),
      headingFont,
      bodyFont,
      // Custom fonts get a signed URL so the browser preview can load the real TTF.
      headingFontUrl: headingFont.kind === 'custom' ? await sign(headingFont.path) : null,
      bodyFontUrl: bodyFont.kind === 'custom' ? await sign(bodyFont.path) : null,
    });
  }
  return out;
}
