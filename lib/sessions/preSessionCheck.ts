// Whitelist of pre-session-check keys allowed by updatePreSessionCheckAction.
// Lives in a non-'use server' module so the server-action file can stay
// async-only (Next.js's "use server" restricts exports to async functions).
//
// Adding a key: extend this tuple, update the server-action shape if needed,
// and document in supabase/CLAUDE.md ("sessions.pre_session_check schema").

export const ALLOWED_PRE_SESSION_KEYS = ['a11y_reviewed', 'recording_consent'] as const;
export type PreSessionCheckKey = (typeof ALLOWED_PRE_SESSION_KEYS)[number];
