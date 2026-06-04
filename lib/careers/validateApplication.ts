// lib/careers/validateApplication.ts
import {
  APP_ADDRESS_MAX,
  APP_EMAIL_MAX,
  APP_LINKEDIN_MAX,
  APP_NAME_MAX,
  APP_PHONE_MAX,
  APP_PHONE_MIN,
  CV_ALLOWED_TYPES,
  CV_MAX_BYTES,
} from './constants';

export type ApplicationFieldCode =
  | 'invalid_first_name'
  | 'invalid_last_name'
  | 'invalid_email'
  | 'invalid_address'
  | 'invalid_phone'
  | 'invalid_linkedin'
  | 'terms_required'
  | 'spam';

export type CvCode = 'cv_missing' | 'cv_too_large' | 'cv_bad_type';

export interface ApplicationFieldInput {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  phone: string;
  linkedinUrl: string;
  termsAccepted: boolean;
  honeypot: string;
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Deliberately permissive shape check: one @, a dot in the domain, no spaces.
// Real deliverability is unknowable here; this just rejects obvious typos.
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateApplicationFields(
  input: ApplicationFieldInput,
): ApplicationFieldCode | null {
  // Honeypot: a real user never fills this hidden field.
  if (input.honeypot.trim().length > 0) return 'spam';
  if (!input.termsAccepted) return 'terms_required';

  const first = input.firstName.trim();
  if (first.length === 0 || first.length > APP_NAME_MAX) return 'invalid_first_name';
  const last = input.lastName.trim();
  if (last.length === 0 || last.length > APP_NAME_MAX) return 'invalid_last_name';
  const email = input.email.trim();
  if (email.length < 3 || email.length > APP_EMAIL_MAX || !isEmail(email)) return 'invalid_email';
  const address = input.address.trim();
  if (address.length === 0 || address.length > APP_ADDRESS_MAX) return 'invalid_address';

  // Phone is a composed +<code><number> string. Require leading + then digits
  // and spaces only (matches what PhoneInput emits — never tabs/newlines).
  const phone = input.phone.trim();
  if (phone.length < APP_PHONE_MIN || phone.length > APP_PHONE_MAX) return 'invalid_phone';
  if (!/^\+[0-9][0-9 ]*$/.test(phone)) return 'invalid_phone';

  const linkedin = input.linkedinUrl.trim();
  if (linkedin.length === 0 || linkedin.length > APP_LINKEDIN_MAX) return 'invalid_linkedin';
  if (!isHttpUrl(linkedin)) return 'invalid_linkedin';

  return null;
}

export function validateCvFile(
  file: { type: string; size: number } | null | undefined,
): CvCode | null {
  if (!file || file.size === 0) return 'cv_missing';
  if (file.size > CV_MAX_BYTES) return 'cv_too_large';
  if (!CV_ALLOWED_TYPES[file.type]) return 'cv_bad_type';
  return null;
}
