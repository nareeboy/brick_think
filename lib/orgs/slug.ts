// Pure helpers for organisation slugs. Mirrors the DB constraint:
//   ^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$ , length 2..40.

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export const MIN_SLUG_LENGTH = 2;
export const MAX_SLUG_LENGTH = 40;

export function suggestSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (cleaned.length < MIN_SLUG_LENGTH) return '';
  if (cleaned.length <= MAX_SLUG_LENGTH) return cleaned;
  // Truncate at the last hyphen within the window if there is one.
  const truncated = cleaned.slice(0, MAX_SLUG_LENGTH);
  const lastHyphen = truncated.lastIndexOf('-');
  if (lastHyphen >= MIN_SLUG_LENGTH) return truncated.slice(0, lastHyphen);
  return truncated;
}

export function isValidSlug(value: string): boolean {
  if (value.length < MIN_SLUG_LENGTH || value.length > MAX_SLUG_LENGTH) {
    return false;
  }
  return SLUG_PATTERN.test(value);
}
