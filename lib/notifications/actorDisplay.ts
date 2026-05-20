interface ResolveActorDisplayArgs {
  fullName: string | null | undefined;
  email: string | null | undefined;
  fallback?: string;
}

/**
 * Mirror of the GlobalHeader display rule: prefer full_name unless it looks
 * like the email's local part (a common Google-OAuth backfill artefact), in
 * which case fall back to the full email. Final fallback: the provided fallback
 * string, or "Someone" if no fallback was specified.
 *
 * Lives outside dispatch.ts because that file imports 'server-only' and the
 * pure helper is referenced from contexts (tests, future client-side previews)
 * that mustn't pull in server-only deps.
 */
export function resolveActorDisplay({ fullName, email, fallback = 'Someone' }: ResolveActorDisplayArgs): string {
  const trimmedName = fullName?.trim() || null;
  const emailLocalPart = email?.split('@')[0]?.toLowerCase() ?? null;
  const looksLikePrefix =
    trimmedName !== null && emailLocalPart !== null && trimmedName.toLowerCase() === emailLocalPart;
  const candidate = looksLikePrefix ? null : trimmedName;
  return candidate || email || fallback;
}
