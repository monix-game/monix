import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../../db';
import { deriveAuth, onlyActive } from '../../../middleware';
import { UPGRADES } from '../../../../common/upgrades';

type BuyUpgradeOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string };

export const buyUpgrade = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/upgrades/buy',
    async ({ body, authUser, set }) => {
      const { upgrade_id } = body;
      if (!upgrade_id) {
        set.status = 400;
        return { error: 'Missing upgrade ID' };
      }

      const authUser2 = authUser;
      if (!authUser2) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const upgrade = UPGRADES.find(u => u.id === upgrade_id);
      if (!upgrade) {
        set.status = 404;
        return { error: 'Upgrade not found' };
      }

      const upgradeCost = upgrade.price_per_half_hour;

      const result = await mutateUserAndSave<BuyUpgradeOutcome>(
        authUser2.uuid,
        async user => {
          if (user.money < upgradeCost) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient money' } };
          }

          user.money -= upgradeCost;
          user.upgrades = user.upgrades || {};
          user.upgrades[upgrade_id] = {
            expires_at: Date.now() + 30 * 60 * 1000, // expires in 30 minutes
          };

          return { changed: true, value: { ok: 'success' as const, message: 'Upgrade purchased successfully' } };
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
    },
    {
      body: t.Object({ upgrade_id: t.Optional(t.String()) }),
    }
  );

export default buyUpgrade;
