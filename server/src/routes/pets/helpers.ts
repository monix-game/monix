import { getPetsByOwnerUUID, updatePet } from '../../db';
import type { IUser } from '../../../common/models/user';
import type { IPet } from '../../../common/models/pet';
import { calculateHunger, isPetCharmed } from '../../../common/pet';

export const FEED_COSTS: { [key: string]: number } = {
  standard: 20,
  premium: 50,
};

export const FEED_EXP: { [key: string]: number } = {
  standard: 10,
  premium: 25,
};

export const PET_SLOT_MIN = 3;
export const PET_SLOT_MAX = 10;

export function getPetSlotLimit(user: IUser): number {
  const rawSlots = typeof user.pet_slots === 'number' ? user.pet_slots : PET_SLOT_MIN;
  return Math.min(Math.max(rawSlots, PET_SLOT_MIN), PET_SLOT_MAX);
}

/**
 * Cost of the next purchasable kennel slot.
 */
export function petSlotCost(currentLimit: number): number {
  // Each bought slot costs more than the last, starting at 25k for the 4th.
  const purchased = Math.max(0, currentLimit - PET_SLOT_MIN);
  return Math.floor(25_000 * Math.pow(2.4, purchased));
}

export function canBuyPetSlot(user: IUser): { ok: boolean; reason?: string; cost?: number } {
  const currentSlots = typeof user.pet_slots === 'number' ? user.pet_slots : PET_SLOT_MIN;
  if (currentSlots >= PET_SLOT_MAX) {
    return { ok: false, reason: 'You have bought the maximum number of pet slots' };
  }

  const cost = petSlotCost(currentSlots);
  if ((user.money || 0) < cost) {
    return { ok: false, reason: 'Insufficient funds', cost };
  }

  return { ok: true, cost };
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
    if (isPetCharmed(pet)) continue;
    const hunger = calculateHunger(pet.time_last_fed);
    if (hunger >= 100) {
      // Pet is starving, it dies
      pet.is_dead = true;
      await updatePet(pet);
    }
  }
  return pets;
}
