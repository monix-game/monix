import { Elysia } from 'elysia';
import { deleteSessionsByUserUUID, deletePetsByOwnerUUID, deleteUserByUUID } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';

export const deleteAccount = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post('/delete', async ({ authUser, set }) => {
    const user = authUser;

    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    // Deleting user sessions
    await deleteSessionsByUserUUID(user.uuid);

    // Deleting user pets
    await deletePetsByOwnerUUID(user.uuid);

    // Deleting user
    await deleteUserByUUID(user.uuid);

    return { message: 'User account deleted successfully' };
  });

export default deleteAccount;
