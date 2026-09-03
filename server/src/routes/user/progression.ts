import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { PERMANENT_UPGRADES, permanentUpgradeCost } from '../../../common/upgrades';
import { resources } from '../../../common/resources';
import { getFishValue } from '../../../common/fishing/fishing';
import type { IUser } from '../../../common/models/user';

function getUserNetWorth(user: IUser): number {
  const resourceValue = Object.entries(user.resources || {}).reduce((total, [id, quantity]) => {
    return total + (resources.find(resource => resource.id === id)?.basePrice || 0) * quantity;
  }, 0);
  const aquariumValue = (user.fishing?.aquarium?.fish || []).reduce(
    (total, fish) => total + getFishValue(fish),
    0
  );
  return user.money + resourceValue + aquariumValue;
}

export const progressionRoutes = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/prestige', async ({ authUser, set }) => {
    const result = await mutateUserAndSave<{ ok: boolean; shards?: number; error?: string }>(
      authUser?.uuid as string,
      async user => {
        const netWorth = getUserNetWorth(user);
        const shards = Math.floor(Math.sqrt(netWorth / 1_000_000_000));
        if (shards < 1) {
          return {
            changed: false,
            value: { ok: false, error: 'You need at least 1 billion net worth to prestige.' },
          };
        }
        const prestige = user.prestige || { count: 0, shards: 0, lifetime_earned: 0 };
        prestige.count += 1;
        prestige.shards += shards;
        prestige.lifetime_earned += netWorth;
        user.prestige = prestige;
        user.money = 1000;
        user.resources = {};
        user.fishing = {
          equipped_rod: 'damaged-rod',
          rods_owned: ['damaged-rod'],
          aquarium: { capacity: 10, level: 1, fish: [] },
        };
        return { changed: true, value: { ok: true, shards } };
      }
    );
    if (!result) set.status = 404;
    if (result && !result.ok) set.status = 400;
    return result || { error: 'User not found' };
  })
  .post(
    '/permanent-upgrade',
    async ({ body, authUser, set }) => {
      const upgrade = PERMANENT_UPGRADES.find(item => item.id === body.upgrade_id);
      if (!upgrade) {
        set.status = 404;
        return { error: 'Upgrade not found' };
      }
      const result = await mutateUserAndSave<{ ok: boolean; level?: number; error?: string }>(
        authUser?.uuid as string,
        async user => {
          user.prestige ??= { count: 0, shards: 0, lifetime_earned: 0 };
          user.permanent_upgrades ??= {};
          const level = user.permanent_upgrades[upgrade.id] || 0;
          if (level >= upgrade.maxLevel) {
            return { changed: false, value: { ok: false, error: 'Upgrade is maxed.' } };
          }
          const cost = permanentUpgradeCost(upgrade, level);
          if (user.prestige.shards < cost) {
            return { changed: false, value: { ok: false, error: 'Not enough prestige shards.' } };
          }
          user.prestige.shards -= cost;
          user.permanent_upgrades[upgrade.id] = level + 1;
          return { changed: true, value: { ok: true, level: level + 1 } };
        }
      );
      if (!result) set.status = 404;
      if (result && !result.ok) set.status = 400;
      return result || { error: 'User not found' };
    },
    { body: t.Object({ upgrade_id: t.String() }) }
  );

export default progressionRoutes;
