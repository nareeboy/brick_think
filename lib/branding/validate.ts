import { BRAND_FOOTER_MAX, BRAND_NAME_MAX, type FontChoice } from './types';
import { CURATED_FONT_KEYS } from './curatedFontsCatalog';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColour(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value);
}

export function isValidName(value: unknown): value is string {
  return (
    typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= BRAND_NAME_MAX
  );
}

export function isValidFooter(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  return typeof value === 'string' && value.length <= BRAND_FOOTER_MAX;
}

/**
 * Validate a FontChoice. Curated keys must exist in the catalog. Custom paths
 * are validated by shape only here (the byte upload is validated separately by
 * isTtf at upload time).
 */
export function isValidFontChoice(value: unknown): value is FontChoice {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.kind === 'curated') return typeof v.key === 'string' && CURATED_FONT_KEYS.includes(v.key);
  if (v.kind === 'custom') return typeof v.path === 'string' && v.path.length > 0;
  return false;
}
