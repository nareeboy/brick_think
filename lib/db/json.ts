import type { Json } from '@/lib/db/types.generated';

/**
 * Recursively re-maps T with every non-JSON-serialisable leaf (function,
 * symbol, bigint, Date methods, Map/Set internals…) replaced by `never`.
 * `T extends JsonSafe<T>` therefore holds exactly when T is JSON-shaped.
 *
 * This deliberately checks structure rather than requiring an index
 * signature, so plain interfaces (CanvasState, A11yPreferences, …) pass —
 * interface-to-`Json` assignment is what forced the old
 * `as unknown as Json` casts.
 */
export type JsonSafe<T> = T extends string | number | boolean | null | undefined
  ? T
  : T extends (...args: never[]) => unknown
    ? never
    : T extends readonly (infer U)[]
      ? readonly JsonSafe<U>[]
      : T extends object
        ? { [K in keyof T]: JsonSafe<T[K]> }
        : never;

/**
 * The one sanctioned bridge from a typed app value to a `Json` column write.
 * Compile-time only — the `JsonSafe` constraint proves `value` carries no
 * functions/Dates/Maps — so the runtime is the identity.
 *
 * Replaces the repo's `X as unknown as Json` casts; that pattern is banned by
 * ESLint (no-restricted-syntax) so it can't regrow.
 */
export function toJson<T>(value: T & JsonSafe<T>): Json {
  // eslint-disable-next-line no-restricted-syntax -- the single sanctioned Json bridge; safety is proven by the JsonSafe constraint above.
  return value as unknown as Json;
}
