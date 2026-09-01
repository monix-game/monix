import * as crypto from 'node:crypto';

export const RECOVERY_CODE_COUNT = 10;

// Format: XXXX-XXXX-XXXX (12 chars, no ambiguous characters)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a single human-readable recovery code without ambiguous characters.
 */
export function generateRecoveryCode(): string {
  const chars = new Array(12);
  for (let i = 0; i < 12; i++) {
    chars[i] = ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  const joined = chars.join('');
  return `${joined.slice(0, 4)}-${joined.slice(4, 8)}-${joined.slice(8, 12)}`;
}

/**
 * Generate a fresh set of recovery codes (their plaintext form) along with the
 * list of SHA-256 hashes to persist.
 */
export function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): {
  plain: string[];
  hashes: { code_hash: string; used: boolean }[];
} {
  const plain: string[] = [];
  const hashes: { code_hash: string; used: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    const code = generateRecoveryCode();
    plain.push(code);
    hashes.push({ code_hash: hashRecoveryCode(code), used: false });
  }
  return { plain, hashes };
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex');
}

/**
 * Normalize user input by stripping spaces/dashes and uppercasing.
 */
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Verify a submitted code against the user's stored (hashed) recovery codes.
 * Marks the matched code as used. Returns true if the code was valid and now consumed.
 */
export function verifyRecoveryCode(
  stored: { code_hash: string; used: boolean }[],
  submitted: string
): boolean {
  const normalized = normalizeRecoveryCode(submitted);
  const hashed = hashRecoveryCode(normalized);
  const match = stored.find(c => c.code_hash === hashed && !c.used);
  if (!match) return false;
  match.used = true;
  return true;
}
