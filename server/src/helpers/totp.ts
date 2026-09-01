import * as crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD = 30;
const DIGITS = 6;

const BASE32_LOOKUP = new Map<string, number>(
  BASE32_ALPHABET.split('').map((char, index) => [char, index])
);

/**
 * Decode a Base32 (RFC 4648) string into a buffer.
 * @param secret - The Base32 encoded secret
 * @returns The decoded bytes
 */
function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  const bits: number[] = [];

  for (const char of clean) {
    const value = BASE32_LOOKUP.get(char);
    if (value === undefined) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }
    for (let i = 4; i >= 0; i--) {
      bits.push((value >> i) & 1);
    }
  }

  const bytes: number[] = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    bytes.push(byte);
  }

  return Buffer.from(bytes);
}

/**
 * Generate a TOTP token for a given secret using HMAC-SHA1 (RFC 6238).
 * @param secret - The Base32 TOTP secret
 * @param time - The current time in milliseconds (defaults to now)
 * @returns The generated 6-digit token
 */
export function generateToken(secret: string, time: number = Date.now()): string {
  const key = base32Decode(secret);
  const counter = Math.floor(time / 1000 / PERIOD);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** DIGITS;
  return otp.toString().padStart(DIGITS, '0');
}

/**
 * Create a new random TOTP secret (Base32 encoded, 128-bit/16 chars).
 * @returns A newly generated TOTP secret
 */
export function createSecret(): string {
  // 16 Base32 characters = 80 bits, so 10 random bytes provide enough entropy
  const raw = crypto.randomBytes(10);
  let result = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of raw) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(buffer << (5 - bits)) & 0x1f];
  }
  return result.slice(0, 16);
}

/**
 * Verify a TOTP token against a given secret.
 * @param secret - The Base32 TOTP secret
 * @param token - The TOTP token to verify
 * @param window - Number of time steps to allow before/after the current step
 * @returns Whether the provided token is valid
 */
export function verifyTOTPToken(secret: string, token: string, window = 1): boolean {
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    const generatedToken = generateToken(secret, now + i * PERIOD * 1000);
    // Use a constant-time comparison to avoid leaking timing information
    if (crypto.timingSafeEqual(Buffer.from(generatedToken), Buffer.from(token))) {
      return true;
    }
  }
  return false;
}

/**
 * Get the TOTP URI for use with authenticator apps.
 * @param secret - The Base32 TOTP secret
 * @param username - The username associated with the TOTP
 * @returns The TOTP URI for use with authenticator apps
 */
export function getTOTPURI(secret: string, username: string): string {
  return `otpauth://totp/Monix:${username}?secret=${secret}&issuer=Monix&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}
