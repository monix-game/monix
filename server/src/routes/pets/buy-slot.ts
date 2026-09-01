import { Elysia } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { hasGems } from '../../../common/math';
import { PET_SLOT_COST, PET_SLOT_MAX, getPetSlotLimit } from './helpers';

export const buySlot = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/buy-slot', async ({ authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const currentSlots = getPetSlotLimit(fetchedUser);
    if (currentSlots >= PET_SLOT_MAX) {
      set.status = 400;
      return { error: 'You have reached the maximum pet slots (10)' };
    }

    if (!hasGems(fetchedUser.gems, PET_SLOT_COST)) {
      set.status = 400;
      return { error: 'Insufficient gems to buy a pet slot' };
    }

    if (fetchedUser.gems !== -1) {
      fetchedUser.gems = (fetchedUser.gems || 0) - PET_SLOT_COST;
    }
    fetchedUser.pet_slots = currentSlots + 1;
    await updateUser(fetchedUser);

    return {
      message: 'Pet slot purchased successfully',
      pet_slots: fetchedUser.pet_slots,
      gems: fetchedUser.gems,
    };
  });

export default buySlot;
