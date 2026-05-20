import { createServerSupabaseClient } from '@/lib/db/server';

// RSC-side initial fetch for the brick-feedback overlay. The design page
// renders this synchronously; the realtime channel hydrates on top of the
// returned arrays. Both queries are RLS-scoped — `can_edit_room` is the
// gate so non-members get empty arrays.

export interface ReactionRow {
  brick_id: string;
  profile_id: string;
  emoji: string;
}

export interface CommentRow {
  id: string;
  brick_id: string;
  // Author may be null after account deletion (profile_id ON DELETE SET NULL).
  profile_id: string | null;
  body: string;
  created_at: string;
  // Joined from profiles; null when the row's author is missing.
  full_name: string | null;
}

export async function loadInitialBrickFeedback(
  modelId: string,
): Promise<{ reactions: ReactionRow[]; comments: CommentRow[] }> {
  const supabase = await createServerSupabaseClient();
  const [reactionsRes, commentsRes] = await Promise.all([
    supabase
      .from('brick_reactions')
      .select('brick_id, profile_id, emoji')
      .eq('model_id', modelId),
    supabase
      .from('brick_comments')
      .select('id, brick_id, profile_id, body, created_at, profiles(full_name)')
      .eq('model_id', modelId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  const reactions = (reactionsRes.data ?? []) as ReactionRow[];
  const comments = (commentsRes.data ?? []).map(
    (row: {
      id: string;
      brick_id: string;
      profile_id: string | null;
      body: string;
      created_at: string;
      profiles: { full_name: string | null } | null;
    }) => ({
      id: row.id,
      brick_id: row.brick_id,
      profile_id: row.profile_id,
      body: row.body,
      created_at: row.created_at,
      full_name: row.profiles?.full_name ?? null,
    }),
  );
  return { reactions, comments };
}
