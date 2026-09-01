import { Elysia } from 'elysia';
import { updateUser } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';

export const resetTutorial = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post('/tutorial/reset', async ({ authUser, set }) => {
    const user = authUser;

    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    if (user.completed_tutorial) {
      user.completed_tutorial = false;
      await updateUser(user);
    }

    return { message: 'Tutorial reset' };
  });

export default resetTutorial;
