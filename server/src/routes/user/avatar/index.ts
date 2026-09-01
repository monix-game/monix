import { Elysia } from 'elysia';
import uploadAvatar from './upload';
import removeAvatar from './remove';

export const avatarRoutes = new Elysia()
  .use(uploadAvatar)
  .use(removeAvatar);

export default avatarRoutes;
