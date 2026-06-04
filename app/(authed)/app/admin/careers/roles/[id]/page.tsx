import { notFound } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/db/server';
import { DeleteRoleButton } from '../DeleteRoleButton';
import { RoleEditor } from '../RoleEditor';
import { RoleStatusPill } from '../RoleStatusPill';
import { RoleToggleButton } from '../RoleToggleButton';

export const dynamic = 'force-dynamic';

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('careers_roles')
    .select('id, slug, title, location, employment_type, summary, description_html, is_open')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-zinc-950">Edit role</h1>
        <div className="flex items-center gap-3">
          <RoleStatusPill isOpen={data.is_open} />
          <RoleToggleButton id={data.id} isOpen={data.is_open} />
          <DeleteRoleButton id={data.id} />
        </div>
      </div>
      <RoleEditor
        mode="edit"
        initial={{
          id: data.id,
          title: data.title,
          slug: data.slug,
          location: data.location,
          employmentType: data.employment_type,
          summary: data.summary,
          descriptionHtml: data.description_html,
        }}
      />
    </div>
  );
}
