import type { PunishXCategory } from '../punishx/categories';

export interface IPunishment {
  uuid: string;
  user_uuid: string;
  type: 'game_ban' | 'social_ban';
  category: PunishXCategory;
  level: number;
  reason: string;
  issued_by: string;
  issued_at: number;
  duration: number; // in minutes, -1 for permanent
  lifted_at?: number;
}

export function hasExpired(punishment: IPunishment): boolean {
  if (punishment.lifted_at) return true;
  if (punishment.duration === -1) return false; // Permanent punishment

  const expiryTime = punishment.issued_at + punishment.duration * 60 * 1000;
  return Date.now() > expiryTime;
}

export function getRemainingDuration(punishment: IPunishment): number | null {
  if (punishment.duration === -1) return null; // Permanent punishment

  const expiryTime = punishment.issued_at + punishment.duration * 60 * 1000;
  const remainingTime = expiryTime - Date.now();

  return remainingTime > 0 ? remainingTime : 0;
}
