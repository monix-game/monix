import { Elysia } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { getAquariumUpgradeCost } from '../../../common/fishing/fishing';

type UpgradeOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; money: number; aquarium_capacity: number };

export const upgradeAquarium = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/aquarium/upgrade', async ({ authUser, set }) => {
    const user_uuid = authUser?.uuid as string;

    const result = await mutateUserAndSave<UpgradeOutcome>(
      user_uuid,
      async fetchedUser => {
        // Initialize fishing data if not present
        fetchedUser.fishing ??= {
          aquarium: { capacity: 10, level: 1, fish: [] },
          bait_owned: {},
          fish_caught: {},
          rods_owned: [],
        };

        const upgradeCost = getAquariumUpgradeCost(fetchedUser.fishing.aquarium.level || 1);

        if (fetchedUser.money < upgradeCost) {
          return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient funds' } };
        }

        // Deduct money and upgrade aquarium capacity
        fetchedUser.money -= upgradeCost;
        fetchedUser.fishing.aquarium.capacity += 10;
        fetchedUser.fishing.aquarium.level = (fetchedUser.fishing.aquarium.level || 1) + 1;

        fetchedUser.stats ??= DEFAULT_USER_STATS;
        fetchedUser.stats.aquarium_upgrades = (fetchedUser.stats.aquarium_upgrades || 0) + 1;

        return {
          changed: true,
          value: {
            ok: 'success' as const,
            message: 'Aquarium upgraded successfully',
            money: fetchedUser.money,
            aquarium_capacity: fetchedUser.fishing.aquarium.capacity,
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

export default upgradeAquarium;
