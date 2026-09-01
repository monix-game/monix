import { Elysia } from 'elysia';
import { deriveAuth, onlyAuth } from '../../../middleware';

export const passkeyList = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .get('/passkey/list', ({ authUser, set }) => {
    const user = authUser;
    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    return {
      passkeys: (user.passkeys || []).map(pk => ({
        id: pk.id,
        name: pk.name,
        created_at: pk.created_at,
      })),
    };
  });

export default passkeyList;
