import { Elysia } from 'elysia';
import { deriveAuth, onlyAuth } from '../../../middleware';

export const recoveryCount = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .get('/recovery/count', ({ authUser, set }) => {
    const user = authUser;
    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const codes = user.recovery_codes || [];
    const unused = codes.filter(c => !c.used).length;

    return { total: codes.length, unused };
  });

export default recoveryCount;
