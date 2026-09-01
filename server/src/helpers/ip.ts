import { SERVER_PUBLIC_IP } from '../constants';

export type HeaderMap = Record<string, string | undefined>;

export function getRequestIp(headers: HeaderMap, remoteIp?: string): string | undefined {
  let foundIp: string | undefined;

  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    foundIp = forwarded.split(',')[0]?.trim();
  }

  const realIp = headers['x-real-ip'];
  if (realIp && realIp.trim() !== '') {
    foundIp = realIp.trim();
  }

  const clientIp = headers['client-ip'];
  if (clientIp && clientIp.trim() !== '') {
    foundIp = clientIp.trim();
  }

  const loopbackIps = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1']);

  if (foundIp && loopbackIps.has(foundIp)) {
    foundIp = SERVER_PUBLIC_IP || foundIp;
  }

  if (foundIp === '192.168.1.1') {
    foundIp = SERVER_PUBLIC_IP || foundIp;
  }

  if (!foundIp && remoteIp && loopbackIps.has(remoteIp)) {
    foundIp = SERVER_PUBLIC_IP || remoteIp;
  }

  return foundIp || remoteIp || undefined;
}
