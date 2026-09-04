import type { HeaderMap } from './ip';
import { getRequestIp } from './ip';

const cache = new Map<string, { country: string; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isPrivateIp(ip: string): boolean {
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.3') ||
    ip.startsWith('fc') ||
    ip.startsWith('fd')
  );
}

export async function countryForIp(ip: string | undefined): Promise<string> {
  if (!ip || isPrivateIp(ip)) return 'XX';
  const cached = cache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.country;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = (await response.json()) as { status?: string; country?: string };
    const country = data.status === 'success' && data.country ? data.country : 'Unknown';
    cache.set(ip, { country, expiresAt: Date.now() + CACHE_TTL_MS });
    return country;
  } catch {
    return 'XX';
  }
}

export function requestIpFromHeaders(headers: HeaderMap, remoteIp?: string): string | undefined {
  return getRequestIp(headers, remoteIp);
}
