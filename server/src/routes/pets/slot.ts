import { Elysia } from 'elysia';
import { getUserByUUID, mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { PET_SLOT_MAX, canBuyPetSlot, getPetSlotLimit, petSlotCost } from './helpers';

type SlotOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; pet_slots: number; slotLimit: number; cost: number };

/**
 * Purchases an extra kennel slot. Slots bought here stack on top of any
 * `expanded_kennel` permanent upgrades, up to PET_SLOT_MAX base slots.
 */
export const slot = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/slot', async ({ authUser, set }) => {
    const user_uuid = authUser?.uuid as string;

    const result = await mutateUserAndSave<SlotOutcome>(user_uuid, fetchedUser => {
      const currentSlots =
        typeof fetchedUser.pet_slots === 'number' ? fetchedUser.pet_slots : PET_SLOT_MAX - 7;
      const check = canBuyPetSlot(fetchedUser);
      if (!check.ok) {
        return {
          changed: false,
          value: {
            ok: 'error' as const,
            status: 400,
            error: check.reason || 'Cannot buy a pet slot',
          },
        };
      }

      const cost = check.cost ?? petSlotCost(currentSlots);
      if ((fetchedUser.money || 0) < cost) {
        return {
          changed: false,
          value: { ok: 'error' as const, status: 400, error: 'Insufficient funds' },
        };
      }

      fetchedUser.money = (fetchedUser.money || 0) - cost;
      fetchedUser.pet_slots = currentSlots + 1;

      return {
        changed: true,
        value: {
          ok: 'success' as const,
          pet_slots: fetchedUser.pet_slots,
          slotLimit: getPetSlotLimit(fetchedUser),
          cost,
        },
      };
    });

    if (!result) {
      set.status = 404;
      return { error: 'User not found' };
    }
    if (result.ok === 'error') {
      set.status = result.status;
      return { error: result.error };
    }
    return {
      message: 'Pet slot purchased',
      pet_slots: result.pet_slots,
      slotLimit: result.slotLimit,
      cost: result.cost,
    };
  })
  .get('/slot', async ({ authUser, set }) => {
    // Read-only, so avoid taking the per-user write lock.
    const user = await getUserByUUID(authUser?.uuid as string);
    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }
    const currentSlots = typeof user.pet_slots === 'number' ? user.pet_slots : PET_SLOT_MAX - 7;
    return {
      pet_slots: currentSlots,
      slotLimit: getPetSlotLimit(user),
      nextSlotCost: currentSlots >= PET_SLOT_MAX ? null : petSlotCost(currentSlots),
      canBuy: canBuyPetSlot(user).ok,
    };
  });

export default slot;
