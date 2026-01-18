import { generateSecret, verify, generateURI } from 'otplib';

export function createSecret(): string {
  return generateSecret();
}

export async function verifyTOTPToken(secret: string, token: string): Promise<boolean> {
  const res = await verify({ secret, token });
  return Boolean(res);
}

export function getTOTPURI(secret: string, accountName: string, issuer: string): string {
  return generateURI({ secret, label: accountName, issuer });
}
