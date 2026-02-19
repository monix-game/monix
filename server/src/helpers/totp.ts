import { TokenGenerator } from 'totp-generator-ts';
import * as crypto from 'crypto';

/**
 * Create a new TOTP secret
 * @returns A newly generated TOTP secret
 */
export function createSecret(): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 characters
  const length = 16;
  const randomBytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] & 0x1f; // 0–31, perfectly maps to charset length
    secret += charset[randomIndex];
  }
  return secret;
}

/**
 * Generate a TOTP token for a given secret
 * @param secret - The TOTP secret to generate the token for
 * @returns The generated TOTP token
 */
export function generateToken(secret: string): string {
  const tokenGen = new TokenGenerator({
    algorithm: 'SHA-1',
    period: 30,
    digits: 6,
    timestamp: new Date(),
  });
  return tokenGen.getToken(secret);
}

/**
 * Verify a TOTP token against a given secret
 * @param secret - The TOTP secret to verify against
 * @param token - The TOTP token to verify
 * @returns Whether the provided token is valid for the given secret
 */
export function verifyTOTPToken(secret: string, token: string): boolean {
  const generatedToken = generateToken(secret);
  return generatedToken === token;
}

/**
 * Get the TOTP URI for use with authenticator apps
 * @param secret - The TOTP secret
 * @param username - The username associated with the TOTP
 * @returns The TOTP URI for use with authenticator apps
 */
export function getTOTPURI(secret: string, username: string): string {
  return `otpauth://totp/Monix:${username}?secret=${secret}&issuer=Monix&algorithm=SHA1&digits=6&period=30`;
}
