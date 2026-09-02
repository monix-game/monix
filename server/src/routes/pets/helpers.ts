import { getPetsByOwnerUUID, updatePet } from '../../db';
import type { IUser } from '../../../common/models/user';
import type { IPet } from '../../../common/models/pet';
import { calculateHunger } from '../../../common/pet';

export const FEED_COSTS: { [key: string]: number } = {
  standard: 20,
  premium: 50,
};

export const FEED_EXP: { [key: string]: number } = {
  standard: 10,
  premium: 25,
};

export const PET_SLOT_COST = 50;
export const PET_SLOT_MIN = 3;
export const PET_SLOT_MAX = 10;

export function getPetSlotLimit(user: IUser): number {
  const rawSlots = typeof user.pet_slots === 'number' ? user.pet_slots : PET_SLOT_MIN;
  return Math.min(Math.max(rawSlots, PET_SLOT_MIN), PET_SLOT_MAX);
}

/**
 * Reconciles pet hunger/death for a user's pets in a single DB read, then
 * returns the (possibly updated) pets. Pets that are already dead are skipped
 * so the pets snapshot tick doesn't rewrite the same document every 5 seconds.
 */
export async function updatePlayersPets(user_uuid: string): Promise<IPet[]> {
  const pets = await getPetsByOwnerUUID(user_uuid);
  for (const pet of pets) {
    if (pet.is_dead) continue;
    const hunger = calculateHunger(pet.time_last_fed);
    if (hunger >= 100) {
      // Pet is starving, it dies
      pet.is_dead = true;
      await updatePet(pet);
    }
  }
  return pets;
}
