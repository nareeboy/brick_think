// Cap shared between the server action (length validation) and client editor
// (textarea maxLength + counter). Kept in a tiny constants module so client
// components don't pull in the server-only DB helpers that live alongside
// `getFacilitatorNotes`.
export const FACILITATOR_NOTES_MAX = 8000;
