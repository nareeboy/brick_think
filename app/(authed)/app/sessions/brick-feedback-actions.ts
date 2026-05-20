'use server';

import { createServerSupabaseClient } from '@/lib/db/server';
import { COMMENT_BODY_MAX, isValidReactionEmoji } from '@/lib/brickFeedback/palette';

// Brick-feedback writes flow through the user-scoped Supabase client so RLS
// (specifically `can_edit_room`) is the source of truth for who may react /
// comment / soft-delete. The action's only job is to enforce caller-side
// invariants (auth present, payload shape valid) and to translate Postgres
// errors back into a stable discriminated union the client can switch on.

export type ToggleReactionResult =
  | { ok: true; isReacted: boolean }
  | { ok: false; code: 'unauthenticated' | 'cannot_edit_room' | 'invalid_emoji' };

/**
 * Toggle the caller's reaction with `emoji` on a given brick. Idempotent:
 * re-asserting an existing reaction returns `{ ok: true, isReacted: true }`
 * via the 23505-on-insert race path; calling on a row the caller owns
 * deletes it. RLS rejects non-room-members as `cannot_edit_room`.
 */
export async function toggleReactionAction(
  modelId: string,
  brickId: string,
  emoji: string,
): Promise<ToggleReactionResult> {
  if (!isValidReactionEmoji(emoji)) return { ok: false, code: 'invalid_emoji' };

  const userSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  // User-scoped client; RLS gate (can_edit_room) is the authoritative check.
  // Non-room-members get an empty result on select / a violation on insert
  // — both map to `cannot_edit_room` for the caller.
  const { data: existing, error: selErr } = await userSupabase
    .from('brick_reactions')
    .select('emoji')
    .eq('model_id', modelId)
    .eq('brick_id', brickId)
    .eq('profile_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle();
  if (selErr) return { ok: false, code: 'cannot_edit_room' };

  if (existing) {
    const { error } = await userSupabase
      .from('brick_reactions')
      .delete()
      .eq('model_id', modelId)
      .eq('brick_id', brickId)
      .eq('profile_id', user.id)
      .eq('emoji', emoji);
    if (error) return { ok: false, code: 'cannot_edit_room' };
    return { ok: true, isReacted: false };
  }

  const { error } = await userSupabase.from('brick_reactions').insert({
    model_id: modelId,
    brick_id: brickId,
    profile_id: user.id,
    emoji,
  });
  if (error) {
    // Race: another tab inserted the same (model, brick, profile, emoji)
    // between our select and insert. The PK uniqueness fires 23505 — that's
    // a successful no-op from the caller's point of view (the reaction is
    // present, which is what they asked for).
    if ((error as { code?: string }).code === '23505') return { ok: true, isReacted: true };
    return { ok: false, code: 'cannot_edit_room' };
  }
  return { ok: true, isReacted: true };
}

export type AddCommentResult =
  | { ok: true; commentId: string }
  | { ok: false; code: 'unauthenticated' | 'cannot_edit_room' | 'over_cap' | 'empty_body' };

/**
 * Insert a new comment on a brick. Body is trimmed; empty after trim is
 * rejected client-side, over `COMMENT_BODY_MAX` is rejected before the DB
 * (the table's CHECK constraint also enforces it as defence-in-depth).
 */
export async function addCommentAction(
  modelId: string,
  brickId: string,
  body: string,
): Promise<AddCommentResult> {
  const trimmed = body.trim();
  if (trimmed.length === 0) return { ok: false, code: 'empty_body' };
  if (trimmed.length > COMMENT_BODY_MAX) return { ok: false, code: 'over_cap' };

  const userSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const { data, error } = await userSupabase
    .from('brick_comments')
    .insert({ model_id: modelId, brick_id: brickId, profile_id: user.id, body: trimmed })
    .select('id')
    .single();
  if (error || !data) return { ok: false, code: 'cannot_edit_room' };
  return { ok: true, commentId: data.id as string };
}

export type SoftDeleteCommentResult =
  | { ok: true }
  | { ok: false; code: 'unauthenticated' | 'not_author' | 'comment_not_found' | 'already_deleted' };

/**
 * Soft-delete a comment by stamping `deleted_at`. Only the comment's author
 * may delete it — every other failure mode (different user, missing row,
 * already deleted) is surfaced with a distinct code so the UI can pick the
 * right message.
 */
export async function softDeleteCommentAction(
  commentId: string,
): Promise<SoftDeleteCommentResult> {
  const userSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  // Resolve through the user-scoped client; if RLS hides the row (caller
  // can't even read it, e.g. non-room-member) we collapse to
  // `comment_not_found` — same UX as a genuinely missing id.
  const { data: existing } = await userSupabase
    .from('brick_comments')
    .select('profile_id, deleted_at')
    .eq('id', commentId)
    .maybeSingle();
  if (!existing) return { ok: false, code: 'comment_not_found' };
  if (existing.profile_id !== user.id) return { ok: false, code: 'not_author' };
  if (existing.deleted_at) return { ok: false, code: 'already_deleted' };

  const { error } = await userSupabase
    .from('brick_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) return { ok: false, code: 'not_author' };
  return { ok: true };
}
