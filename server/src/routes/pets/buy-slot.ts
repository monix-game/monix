import { Elysia } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { hasGems } from '../../../common/math';
import { PET_SLOT_COST, PET_SLOT_MAX, getPetSlotLimit } from './helpers';

type BuySlotOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; pet_slots: number; gems: number };

export const buySlot = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/buy-slot', async ({ authUser, set }) => {
    const user_uuid = authUser?.uuid as string;

    const result = await mutateUserAndSave<BuySlotOutcome>(
      user_uuid,
      async fetchedUser => {
        const currentSlots = getPetSlotLimit(fetchedUser);
        if (currentSlots >= PET_SLOT_MAX) {
          return { changed: false, value: { ok: 'error', status: 400, error: 'You have reached the maximum pet slots (10)' } };
        }

        if (!hasGems(fetchedUser.gems, PET_SLOT_COST)) {
          return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient gems to buy a pet slot' } };
        }

        if (fetchedUser.gems !== -1) {
          fetchedUser.gems = (fetchedUser.gems || 0) - PET_SLOT_COST;
        }
        fetchedUser.pet_slots = currentSlots + 1;

        return {
          changed: true,
          value: {
            ok: 'success' as const,
            message: 'Pet slot purchased successfully',
            pet_slots: fetchedUser.pet_slots,
            gems: fetchedUser.gems,
          },
        };
      }
    );

    if (!result) {
      set.status = 404;
      return { error: 'User not found' };
    }
    if (result.ok === 'error') {
      set.status = result.status;
      return { error: result.error };
    }
    return result;
  });

export default buySlot;
