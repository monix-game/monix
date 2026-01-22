import { getRemainingDuration, hasExpired, type IPunishment } from '../../common/models/punishment';
import { IUser } from '../../common/models/user';
import type { PunishXCategory } from '../punishx/categories';
import { v4 } from 'uuid';

/**
 * Get all active (non-expired) punishments for a user.
 * @param user - The user to get active punishments for
 * @returns An array of active (non-expired) punishments for the user
 */
export function getActivePunishments(user: IUser): IPunishment[] {
  if (!user.punishments) return [];

  return user.punishments.filter(punishment => !hasExpired(punishment));
}

/**
 * Check if the user is currently banned.
 * @param user - The user to check
 * @returns True if the user is currently banned, false otherwise
 */
export function isUserBanned(user: IUser): boolean {
  const activePunishments = getActivePunishments(user);
  return activePunishments.length > 0;
}

/**
 * Get the current (longest remaining) punishment for a user.
 * @param user - The user to get the punishment for
 * @returns The current punishment with the longest remaining duration, or null if none exist
 */
export function getCurrentPunishment(user: IUser): IPunishment | null {
  const activePunishments = getActivePunishments(user);
  if (activePunishments.length === 0) return null;

  // Return the longest remaining punishment
  let currentPunishment = activePunishments[0];
  let maxRemaining = getRemainingDuration(currentPunishment) || Infinity;

  for (const punishment of activePunishments) {
    const remaining = getRemainingDuration(punishment) || Infinity;
    if (remaining > maxRemaining) {
      currentPunishment = punishment;
      maxRemaining = remaining;
    }
  }

  return currentPunishment;
}

/**
 * Get the current punishment level for a user in a specific category.
 * @param user - The user to check
 * @param category - The punishment category to check
 * @returns The highest punishment level for the user in the specified category, or null if none exist
 */
export function getPunishmentLevel(user: IUser, category: PunishXCategory): number | null {
  const activePunishments = getActivePunishments(user);
  const punishments = activePunishments.filter(
    punishment => punishment.category.id === category.id
  );

  if (punishments.length === 0) return null;

  // Return the highest level punishment
  return Math.max(...punishments.map(p => p.level));
}

/**
 *
 * @param user - The user to get the punishment for
 * @param category - The punishment category
 * @param issuedBy - The UUID of the staff member issuing the punishment
 * @param reason - The reason for the punishment
 * @returns A new punishment object for the user based on the next level in the category
 */
export function getPunishment(
  user: IUser,
  category: PunishXCategory,
  issuedBy: string,
  reason: string
): IPunishment {
  const currentLevel = getPunishmentLevel(user, category) || -1;
  const nextLevel = Math.min(currentLevel + 1, category.levels.length - 1);
  const nextPunishmentLevel = category.levels[nextLevel];

  if (!nextPunishmentLevel) {
    throw new Error('[PunishX] No punishment level found for the specified category and level.');
  }

  return {
    uuid: v4(),
    user_uuid: user.uuid,
    category: category,
    level: nextLevel,
    reason,
    issued_by: issuedBy,
    issued_at: Date.now(),
    duration: nextPunishmentLevel,
  };
}

/**
 * Punish a user by adding a new punishment to their record.
 * NOTE: This function does not save the user to the database; make sure to do so after calling this.
 * @param user - The user to punish
 * @param category - The punishment category
 * @param issuedBy - The UUID of the staff member issuing the punishment
 * @param reason - The reason for the punishment
 * @returns The newly created punishment object that was added to the user
 */
export function punishUser(
  user: IUser,
  category: PunishXCategory,
  issuedBy: string,
  reason: string
): IPunishment {
  const punishment = getPunishment(user, category, issuedBy, reason);

  if (!user.punishments) {
    user.punishments = [];
  }

  user.punishments.push(punishment);
  return punishment;
}
