import { Elysia } from 'elysia';
import register from './register';
import login from './login';
import getUser from './user';
import logout from './logout';
import deleteAccount from './delete';
import changePassword from './change-password';
import twoFARoutes from './2fa';
import cosmeticsRoutes from './cosmetics';
import tutorialRoutes from './tutorial';
import avatarRoutes from './avatar';
import upgradesRoutes from './upgrades';
import rewardsRoutes from './rewards';

export const userRoutes = new Elysia()
  .use(register)
  .use(login)
  .use(twoFARoutes)
  .use(cosmeticsRoutes)
  .use(tutorialRoutes)
  .use(avatarRoutes)
  .use(upgradesRoutes)
  .use(rewardsRoutes)
  .use(getUser)
  .use(logout)
  .use(deleteAccount)
  .use(changePassword);

export default userRoutes;
