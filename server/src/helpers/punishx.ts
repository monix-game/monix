import { hasExpired, IPunishment } from '../../common/models/punishment';
import { IUser } from '../../common/models/user';
import { PunishXCategory } from '../punishx/categories';
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
 * Check if the user is currently banned of a specific type.
 * @param user - The user to check
 * @param type - The type of ban to check ('game_ban' or 'social_ban')
 * @returns True if the user is currently banned of the specified type, false otherwise
 */
export function isUserBanned(user: IUser, type: 'game_ban' | 'social_ban'): boolean {
  const activePunishments = getActivePunishments(user);
  return activePunishments.some(punishment => punishment.type === type);
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
    type: nextPunishmentLevel.type,
    category: category,
    level: nextLevel,
    reason,
    issued_by: issuedBy,
    issued_at: Date.now(),
    duration: nextPunishmentLevel.duration,
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
