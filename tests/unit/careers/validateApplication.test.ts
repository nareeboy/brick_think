// tests/unit/careers/validateApplication.test.ts
import { describe, expect, test } from 'vitest';

import { validateApplicationFields, validateCvFile } from '@/lib/careers/validateApplication';

const valid = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  address: '12 Analytical Engine Rd, London',
  phone: '+447700900123',
  linkedinUrl: 'https://www.linkedin.com/in/ada',
  termsAccepted: true,
  honeypot: '',
};

describe('validateApplicationFields', () => {
  test('accepts a complete valid submission', () => {
    expect(validateApplicationFields(valid)).toBeNull();
  });

  test('rejects missing first name', () => {
    expect(validateApplicationFields({ ...valid, firstName: '  ' })).toBe('invalid_first_name');
  });

  test('rejects unchecked terms', () => {
    expect(validateApplicationFields({ ...valid, termsAccepted: false })).toBe('terms_required');
  });

  test('rejects a missing email', () => {
    expect(validateApplicationFields({ ...valid, email: '  ' })).toBe('invalid_email');
  });

  test('rejects a malformed email', () => {
    expect(validateApplicationFields({ ...valid, email: 'ada@nope' })).toBe('invalid_email');
  });

  test('accepts a plus-addressed email', () => {
    expect(validateApplicationFields({ ...valid, email: 'ada+jobs@example.co.uk' })).toBeNull();
  });

  test('rejects a filled honeypot as spam', () => {
    expect(validateApplicationFields({ ...valid, honeypot: 'bot' })).toBe('spam');
  });

  test('rejects a non-url linkedin value', () => {
    expect(validateApplicationFields({ ...valid, linkedinUrl: 'not-a-url' })).toBe(
      'invalid_linkedin',
    );
  });

  test('rejects a javascript: linkedin url', () => {
    expect(validateApplicationFields({ ...valid, linkedinUrl: 'javascript:alert(1)' })).toBe(
      'invalid_linkedin',
    );
  });

  test('rejects too-short phone', () => {
    expect(validateApplicationFields({ ...valid, phone: '+1' })).toBe('invalid_phone');
  });
});

describe('validateCvFile', () => {
  test('accepts a 1MB pdf', () => {
    expect(validateCvFile({ type: 'application/pdf', size: 1_000_000 })).toBeNull();
  });

  test('rejects an oversized pdf', () => {
    expect(validateCvFile({ type: 'application/pdf', size: 6_000_000 })).toBe('cv_too_large');
  });

  test('rejects an empty file', () => {
    expect(validateCvFile({ type: 'application/pdf', size: 0 })).toBe('cv_missing');
  });

  test('rejects a disallowed type', () => {
    expect(validateCvFile({ type: 'image/png', size: 1000 })).toBe('cv_bad_type');
  });
});
