import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.BRICKTHINK_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error('BRICKTHINK_ENCRYPTION_KEY is not set');
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `BRICKTHINK_ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex chars (got ${hex.length})`,
    );
  }
  return key;
}

export function encryptApiKey(plaintext: string): {
  ciphertext: Buffer;
  nonce: Buffer;
  last4: string;
} {
  const key = getKey();
  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]),
    nonce,
    last4: plaintext.slice(-4),
  };
}

export function decryptApiKey(ciphertext: Buffer, nonce: Buffer): string {
  const key = getKey();
  const ct = ciphertext.subarray(0, ciphertext.length - TAG_LENGTH);
  const tag = ciphertext.subarray(ciphertext.length - TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
