/**
 * One UUID shape check for the whole app. Actions and services both validate
 * ids before hitting the database, so the pattern must have a single home —
 * two copies drift the moment one is loosened.
 */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
