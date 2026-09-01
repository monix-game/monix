import * as crypto from 'node:crypto';

/**
 * Short-lived single-use tokens that gate the passkey authentication flow.
 * After a user proves their password via `passkey/auth-options`, we hand back a
 * `tempToken` bound to their username. The subsequent `passkey/auth-verify`
 * call uses it to look up the user and mint a real session.
 */

interface TempAuth {
  username: string;
  expires_at: number;
}

const tempAuths = new Map<string, TempAuth>();

const TEMP_TOKEN_TTL_MS = 5 * 60 * 1000;

function cleanExpired() {
  const now = Date.now();
  for (const [key, value] of tempAuths) {
    if (value.expires_at < now) {
      tempAuths.delete(key);
    }
  }
}

export function createTempAuth(username: string): string {
  cleanExpired();
  const token = crypto.randomBytes(32).toString('base64url');
  tempAuths.set(token, { username, expires_at: Date.now() + TEMP_TOKEN_TTL_MS });
  return token;
}

export function consumeTempAuth(token: string): string | null {
  cleanExpired();
  const value = tempAuths.get(token);
  if (!value) return null;
  tempAuths.delete(token);
  if (value.expires_at < Date.now()) return null;
  return value.username;
}
