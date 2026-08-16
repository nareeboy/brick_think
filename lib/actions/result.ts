/**
 * The one server-action result convention (tech-debt Tier 2 unification).
 *
 * Shape (canonical since stage-room-actions.ts introduced it):
 *
 *   { ok: true; data: T } | { ok: false; code: E; message?: string }
 *
 * Rules of the convention:
 *
 * - **Domain failures return a code** from a per-family string-literal union
 *   (e.g. 'not_facilitator'). Codes are machine-readable and stable — UI copy
 *   lives in the consumer, not the action.
 * - **`message` is optional** and only for failures whose human-readable text
 *   is genuinely dynamic (e.g. a Supabase error surfaced verbatim). Never use
 *   it as a substitute for a code.
 * - **Infrastructure failures still `throw`** (DB errors on paths that should
 *   never fail, invariant violations). Consumers branch on `ok` for domain
 *   outcomes and rely on error boundaries / try-catch for infra.
 * - A family may extend the failure arm with extra payload on specific codes
 *   (e.g. stage-controller's `invalid_transition` carries `from`/`verb`) by
 *   unioning its own variant alongside `ActionResult`.
 * - Redirect-terminal form actions (`createSession` & co.) stay
 *   `Promise<void>` + `redirect()` — success there is navigation, not data.
 */
export type ActionResult<T, E extends string> =
  | { ok: true; data: T }
  | { ok: false; code: E; message?: string };

/** Success helper: `return ok({ roomIds })` / `return ok(null)` for no payload. */
export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

/** Failure helper: `return fail('not_facilitator')`. */
export function fail<E extends string>(
  code: E,
  message?: string,
): { ok: false; code: E; message?: string } {
  return message === undefined ? { ok: false, code } : { ok: false, code, message };
}
