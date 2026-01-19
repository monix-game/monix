import { TokenGenerator } from 'totp-generator-ts';

export function createSecret(): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 characters
  let secret = '';
  for (let i = 0; i < 16; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    secret += charset[randomIndex];
  }
  return secret;
}

export function generateToken(secret: string): string {
  const tokenGen = new TokenGenerator({
    algorithm: 'SHA-1',
    period: 30,
    digits: 6,
    timestamp: new Date(),
  });
  return tokenGen.getToken(secret);
}

export function verifyTOTPToken(secret: string, token: string): boolean {
  const generatedToken = generateToken(secret);
  return generatedToken === token;
}

export function getTOTPURI(secret: string, username: string): string {
  return `otpauth://totp/Monix:${username}?secret=${secret}&issuer=Monix&algorithm=SHA1&digits=6&period=30`;
}
