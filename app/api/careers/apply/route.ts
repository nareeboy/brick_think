// app/api/careers/apply/route.ts
import { NextResponse } from 'next/server';

import { CAREERS_CV_BUCKET, CV_ALLOWED_TYPES } from '@/lib/careers/constants';
import { validateApplicationFields, validateCvFile } from '@/lib/careers/validateApplication';
import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';

export const runtime = 'nodejs';

function bad(code: string, status = 400) {
  return NextResponse.json({ ok: false, code }, { status });
}

function str(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === 'string' ? v : '';
}

function sanitizeFilename(name: string): string {
  // Keep it predictable in storage paths; drop anything risky.
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 200) : 'cv';
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad('bad_request');
  }

  const fields = {
    firstName: str(form, 'firstName'),
    lastName: str(form, 'lastName'),
    email: str(form, 'email'),
    address: str(form, 'address'),
    phone: str(form, 'phone'),
    linkedinUrl: str(form, 'linkedinUrl'),
    termsAccepted: str(form, 'terms') === 'true' || str(form, 'terms') === 'on',
    honeypot: str(form, 'company'), // hidden field; bots fill it
  };

  const fieldError = validateApplicationFields(fields);
  if (fieldError) {
    // Honeypot hits get a 200 so bots don't learn they were caught.
    if (fieldError === 'spam') return NextResponse.json({ ok: true });
    return bad(fieldError);
  }

  const roleId = str(form, 'roleId');
  if (!roleId) return bad('invalid_role');

  const file = form.get('cv');
  if (!(file instanceof File)) return bad('cv_missing');
  const fileError = validateCvFile({ type: file.type, size: file.size });
  if (fileError) return bad(fileError);

  const supabase = createServiceRoleSupabaseClient();

  // Confirm the role exists and is open before accepting an application.
  const roleRes = await supabase
    .from('careers_roles')
    .select('id, is_open')
    .eq('id', roleId)
    .maybeSingle();
  if (roleRes.error || !roleRes.data || !roleRes.data.is_open) return bad('invalid_role');

  // Insert the row first to get an id for the storage path.
  const insertRes = await supabase
    .from('careers_applications')
    .insert({
      role_id: roleId,
      first_name: fields.firstName.trim(),
      last_name: fields.lastName.trim(),
      email: fields.email.trim(),
      address: fields.address.trim(),
      phone: fields.phone.trim(),
      linkedin_url: fields.linkedinUrl.trim(),
    })
    .select('id')
    .single();
  if (insertRes.error || !insertRes.data) return bad('unknown', 500);

  const applicationId = insertRes.data.id;
  const ext = CV_ALLOWED_TYPES[file.type];
  const filename = sanitizeFilename(file.name) || `cv.${ext}`;
  const path = `${applicationId}/${filename}`;

  const uploadRes = await supabase.storage
    .from(CAREERS_CV_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadRes.error) {
    // Roll back the orphaned row so we never keep a CV-less application.
    await supabase.from('careers_applications').delete().eq('id', applicationId);
    return bad('unknown', 500);
  }

  const patchRes = await supabase
    .from('careers_applications')
    .update({ cv_path: path, cv_filename: file.name.slice(0, 255) })
    .eq('id', applicationId);
  if (patchRes.error) {
    await supabase.storage.from(CAREERS_CV_BUCKET).remove([path]);
    await supabase.from('careers_applications').delete().eq('id', applicationId);
    return bad('unknown', 500);
  }

  return NextResponse.json({ ok: true });
}
