import { Elysia } from 'elysia';
import { deleteMessageByUUID, getMessageByUUID, getUserByUUID } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';

export const dismissEphemeral = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/ephemeral/dismiss/:message_uuid', async ({ params, authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const { message_uuid } = params;

    const message = await getMessageByUUID(message_uuid);

    if (!message) {
      set.status = 404;
      return { error: 'Message not found' };
    }

    if (!message.ephemeral || message.ephemeral_user_uuid !== fetchedUser.uuid) {
      set.status = 403;
      return { error: 'You are not allowed to dismiss this message' };
    }

    await deleteMessageByUUID(message.uuid);

    return { success: true };
  });

export default dismissEphemeral;
