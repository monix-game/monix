import type { PunishXCategory } from '../punishx/categories';

export interface IPunishment {
  uuid: string;
  user_uuid: string;
  category: PunishXCategory;
  level: number;
  reason: string;
  issued_by: string;
  issued_at: number;
  duration: number; // in minutes, -1 for permanent
  lifted_at?: number;
}

/**
 * Check if a punishment has expired.
 * @param punishment - The punishment to check
 * @returns True if the punishment has expired, false otherwise
 */
export function hasExpired(punishment: IPunishment): boolean {
  if (punishment.lifted_at) return true;
  if (punishment.duration === -1) return false; // Permanent punishment

  const expiryTime = punishment.issued_at + punishment.duration * 60 * 1000;
  return Date.now() > expiryTime;
}

/**
 * Get the remaining duration of a punishment.
 * @param punishment - The punishment to check
 * @returns The remaining duration in milliseconds, or -1 for permanent punishments
 */
export function getRemainingDuration(punishment: IPunishment): number {
  if (punishment.duration === -1) return -1; // Permanent punishment

  const expiryTime = punishment.issued_at + punishment.duration * 60 * 1000;
  const remainingTime = expiryTime - Date.now();

  return remainingTime > 0 ? remainingTime : 0;
}
