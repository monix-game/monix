import { Elysia } from 'elysia';
import { getUserByUUID } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { buildRoomMessages } from '../../helpers/snapshots';

export const roomMessages = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/room/:room_uuid/messages', async ({ params, authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const { room_uuid } = params;

    const result = await buildRoomMessages(room_uuid, {
      uuid: fetchedUser.uuid,
      role: fetchedUser.role,
    });

    if ('error' in result) {
      set.status = result.error === 'room_not_found' ? 404 : 403;
      return {
        error:
          result.error === 'room_not_found'
            ? 'Room not found'
            : 'You are not allowed to view messages in this room',
      };
    }

    return { messages: result.messages };
  });

export default roomMessages;