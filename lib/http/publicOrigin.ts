/** Anything exposing a header lookup: `Headers`, or `next/headers` `ReadonlyHeaders`. */
interface HeaderGetter {
  get(name: string): string | null;
}

/**
 * Public-facing origin (`<proto>://<host>`) of the current request.
 *
 * Railway's proxy rewrites the `host` header to the internal port-bound
 * address (e.g. `localhost:8080`) and exposes the real public hostname via
 * `x-forwarded-host`. Building an origin from `host` therefore yields
 * `http://localhost:8080`, which is NOT in Supabase's redirect allow-list — so
 * GoTrue drops the `emailRedirectTo`, falls back to the bare Site URL, and the
 * magic-link template's `{{ .RedirectTo }}&token_hash=…` concatenation emits a
 * malformed, query-less link. Always prefer `x-forwarded-host`.
 *
 * `proto` defaults to `http` so local dev (`pnpm dev`, no proxy headers) builds
 * `http://localhost:3000`; on Railway the proxy always sets `x-forwarded-proto`
 * (= https), so the default never applies in deployed environments.
 *
 * Works with both a Route Handler's `request.headers` (a `Headers`) and the
 * `await headers()` result from `next/headers` — both expose `.get()`.
 */
export function publicOriginFromHeaders(headers: HeaderGetter): string {
  const proto = headers.get('x-forwarded-proto') ?? 'http';
  const host = headers.get('x-forwarded-host') ?? headers.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}
