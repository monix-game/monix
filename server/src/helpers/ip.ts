import type { Request } from 'express';
import { SERVER_PUBLIC_IP } from '../constants';

export function getRequestIp(req: Request): string | undefined {
  let foundIp: string | undefined;

  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    foundIp = forwarded[0].split(',')[0]?.trim();
  }

  if (typeof forwarded === 'string') {
    foundIp = forwarded.split(',')[0]?.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim() !== '') {
    foundIp = realIp.trim();
  }

  const clientIp = req.headers['client-ip'];
  if (typeof clientIp === 'string' && clientIp.trim() !== '') {
    foundIp = clientIp.trim();
  }

  // Convert IPv6 loopback to IPv4 loopback for consistency
  if (foundIp === '::1') {
    foundIp = '127.0.0.1';
  }

  // Convert 192.168.1.1 to the server's own public IP
  if (foundIp === '192.168.1.1') {
    foundIp = SERVER_PUBLIC_IP || foundIp;
  }

  return foundIp || req.ip || req.socket.remoteAddress || undefined;
}
