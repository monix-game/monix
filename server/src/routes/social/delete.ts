import { Elysia } from 'elysia';
import { getMessageByUUID, getRoomByUUID, getUserByUUID, updateMessage } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { hasRole } from '../../../common/roles';
import { markChatChannelDirty } from '../../socket';

export const deleteMessage = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/delete/:message_uuid', async ({ params, authUser, set }) => {
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

    if (message.sender_uuid !== fetchedUser.uuid && fetchedUser.role === 'user') {
      set.status = 403;
      return { error: 'You are not allowed to delete this message' };
    }

    const room = await getRoomByUUID(message.room_uuid);

    if (!room) {
      set.status = 404;
      return { error: 'Room not found' };
    }

    // Check if user is allowed to delete message in the room
    if (room.type === 'private' && !hasRole(fetchedUser.role, 'admin')) {
      set.status = 403;
      return { error: 'You are not allowed to delete messages in this room' };
    }

    if (room.restrict_send_to && !hasRole(fetchedUser.role, room.restrict_send_to)) {
      set.status = 403;
      return { error: 'You are not allowed to delete messages in this room' };
    }

    if (!message.deleted) {
      message.deleted = true;
      message.content = '';
      message.edited = false;
      message.time_edited = Date.now();
      await updateMessage(message);
    }

    markChatChannelDirty(message.room_uuid);

    return { success: true };
  });

export default deleteMessage;
