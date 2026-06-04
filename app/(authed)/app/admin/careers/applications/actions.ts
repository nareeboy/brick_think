'use server';

import { revalidatePath } from 'next/cache';

import { CAREERS_CV_BUCKET } from '@/lib/careers/constants';
import { createCvSignedUrl } from '@/lib/careers/storage';
import { createServerSupabaseClient } from '@/lib/db/server';
import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';

type Status = 'new' | 'reviewed' | 'shortlisted' | 'rejected';

async function assertAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('profiles')
    .select('is_site_admin')
    .eq('id', user.id)
    .maybeSingle();
  return data?.is_site_admin === true;
}

export async function getCvUrlAction(
  applicationId: string,
): Promise<{ ok: true; url: string } | { ok: false; code: 'forbidden' | 'gone' }> {
  if (!(await assertAdmin())) return { ok: false, code: 'forbidden' };
  const service = createServiceRoleSupabaseClient();
  const { data } = await service
    .from('careers_applications')
    .select('cv_path')
    .eq('id', applicationId)
    .maybeSingle();
  if (!data?.cv_path) return { ok: false, code: 'gone' };
  const url = await createCvSignedUrl(service, data.cv_path);
  if (!url) return { ok: false, code: 'gone' };
  return { ok: true, url };
}

export async function setApplicationStatusAction(
  applicationId: string,
  status: Status,
): Promise<{ ok: boolean }> {
  if (!(await assertAdmin())) return { ok: false };
  const supabase = await createServerSupabaseClient();
  const res = await supabase
    .from('careers_applications')
    .update({ status })
    .eq('id', applicationId);
  revalidatePath('/app/admin/careers/applications');
  return { ok: !res.error };
}

export async function deleteApplicationAction(applicationId: string): Promise<{ ok: boolean }> {
  if (!(await assertAdmin())) return { ok: false };
  const service = createServiceRoleSupabaseClient();
  const { data } = await service
    .from('careers_applications')
    .select('cv_path')
    .eq('id', applicationId)
    .maybeSingle();
  if (data?.cv_path) {
    await service.storage.from(CAREERS_CV_BUCKET).remove([data.cv_path]);
  }
  await service.from('careers_applications').delete().eq('id', applicationId);
  revalidatePath('/app/admin/careers/applications');
  return { ok: true };
}
