import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../../db';
import { deriveAuth, onlyActive } from '../../../middleware';
import { UPGRADES } from '../../../../common/upgrades';

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

      const user = await getUserByUUID(authUser2.uuid);
      if (!user) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const upgrade = UPGRADES.find(u => u.id === upgrade_id);
      if (!upgrade) {
        set.status = 404;
        return { error: 'Upgrade not found' };
      }

      const upgradeCost = upgrade.price_per_half_hour;
      if (user.money < upgradeCost) {
        set.status = 400;
        return { error: 'Insufficient money' };
      }

      user.money -= upgradeCost;
      user.upgrades = user.upgrades || {};
      user.upgrades[upgrade_id] = {
        expires_at: Date.now() + 30 * 60 * 1000, // expires in 30 minutes
      };

      await updateUser(user);

      return { message: 'Upgrade purchased successfully' };
    },
    {
      body: t.Object({ upgrade_id: t.Optional(t.String()) }),
    }
  );

export default buyUpgrade;
