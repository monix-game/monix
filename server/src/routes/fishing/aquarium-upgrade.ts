import { Elysia } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { getAquariumUpgradeCost } from '../../../common/fishing/fishing';

export const upgradeAquarium = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/aquarium/upgrade', async ({ authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    // Initialize fishing data if not present
    fetchedUser.fishing ??= {
      aquarium: { capacity: 10, level: 1, fish: [] },
      bait_owned: {},
      fish_caught: {},
      rods_owned: [],
    };

    const upgradeCost = getAquariumUpgradeCost(fetchedUser.fishing.aquarium.level || 1);

    if (fetchedUser.money < upgradeCost) {
      set.status = 400;
      return { error: 'Insufficient funds' };
    }

    // Deduct money and upgrade aquarium capacity
    fetchedUser.money -= upgradeCost;
    fetchedUser.fishing.aquarium.capacity += 10;
    fetchedUser.fishing.aquarium.level = (fetchedUser.fishing.aquarium.level || 1) + 1;

    await updateUser(fetchedUser);

    return {
      message: 'Aquarium upgraded successfully',
      money: fetchedUser.money,
      aquarium_capacity: fetchedUser.fishing.aquarium.capacity,
    };
  });

export default upgradeAquarium;
