import { Elysia } from 'elysia';
import register from './register';
import login from './login';
import needs2fa from './needs-2fa';
import setup2fa from './setup-2fa';
import finish2fa from './finish-2fa';
import remove2fa from './remove-2fa';
import getUser from './user';
import claimDailyReward from './daily-reward-claim';
import completeTutorial from './tutorial-complete';
import resetTutorial from './tutorial-reset';
import logout from './logout';
import deleteAccount from './delete';
import uploadAvatar from './upload-avatar';
import removeAvatar from './remove-avatar';
import changePassword from './change-password';
import buyCosmetic from './cosmetics-buy';
import equipCosmetic from './cosmetics-equip';
import unequipCosmetic from './cosmetics-unequip';
import buyUpgrade from './upgrades-buy';

export const userRoutes = new Elysia()
  .use(register)
  .use(login)
  .use(needs2fa)
  .use(setup2fa)
  .use(finish2fa)
  .use(remove2fa)
  .use(getUser)
  .use(claimDailyReward)
  .use(completeTutorial)
  .use(resetTutorial)
  .use(logout)
  .use(deleteAccount)
  .use(uploadAvatar)
  .use(removeAvatar)
  .use(changePassword)
  .use(buyCosmetic)
  .use(equipCosmetic)
  .use(unequipCosmetic)
  .use(buyUpgrade);

export default userRoutes;
