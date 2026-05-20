// Pure helpers for the 6-char Crockford-style base32 join code.
//
// Source of truth for the alphabet + length is the SQL function
// `public.generate_join_code` defined in
// supabase/migrations/20260520200000_session_join_and_roster.sql. Keep this
// constant in sync with the SQL when the alphabet ever changes — the
// `lookup_session_by_code` RPC normalises lookups to upper-case, so any
// alphabet change has to flow through the migration as well.

export const JOIN_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const JOIN_CODE_LENGTH = 6;

/**
 * True if the (case-insensitive) code is the right length and contains only
 * alphabet characters. Doesn't check DB existence — the redemption action
 * still has to call `lookup_session_by_code` for that.
 */
export function isValidJoinCodeShape(code: string): boolean {
  if (typeof code !== 'string') return false;
  if (code.length !== JOIN_CODE_LENGTH) return false;
  const upper = code.toUpperCase();
  for (const ch of upper) {
    if (!JOIN_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}
