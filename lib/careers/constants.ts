// lib/careers/constants.ts
export const CAREERS_CV_BUCKET = 'careers-cv';

export const ROLE_TITLE_MAX = 200;
export const ROLE_SUMMARY_MAX = 400;
export const ROLE_LOCATION_MAX = 120;
export const ROLE_EMPLOYMENT_TYPE_MAX = 80;
export const ROLE_DESCRIPTION_MAX = 200_000;

export const APP_NAME_MAX = 120;
export const APP_ADDRESS_MAX = 2000;
export const APP_PHONE_MIN = 3;
export const APP_PHONE_MAX = 40;
export const APP_LINKEDIN_MAX = 2000;

export const CV_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
// MIME allowlist. Magic-byte sniffing is overkill here (admin-only download,
// private bucket) — extension + reported type is the gate.
export const CV_ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

// How long a CV download link stays valid.
export const CV_SIGNED_URL_TTL_SECONDS = 60;
