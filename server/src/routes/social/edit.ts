import { Elysia, t } from 'elysia';
import { getMessageByUUID, getRoomByUUID, getUserByUUID, updateMessage } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { profanityFilter } from '../../constants';
import { hasRole } from '../../../common/roles';

export const editMessage = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/edit/:message_uuid',
    async ({ params, body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { message_uuid } = params;
      const { content } = body as { content: string };

      if (!content) {
        set.status = 400;
        return { error: 'Missing content' };
      }

      const message = await getMessageByUUID(message_uuid);

      if (!message) {
        set.status = 404;
        return { error: 'Message not found' };
      }

      if (message.sender_uuid !== fetchedUser.uuid && fetchedUser.role === 'user') {
        set.status = 403;
        return { error: 'You are not allowed to edit this message' };
      }

      const room = await getRoomByUUID(message.room_uuid);

      if (!room) {
        set.status = 404;
        return { error: 'Room not found' };
      }

      // Check if user is allowed to edit message in the room
      if (room.type === 'private' && !hasRole(fetchedUser.role, 'admin')) {
        set.status = 403;
        return { error: 'You are not allowed to edit messages in this room' };
      }

      if (room.restrict_send_to && !hasRole(fetchedUser.role, room.restrict_send_to)) {
        set.status = 403;
        return { error: 'You are not allowed to edit messages in this room' };
      }

      // Make sure the content is not empty after trimming
      if (content.trim() === '') {
        set.status = 400;
        return { error: 'Message content cannot be empty' };
      }

      // Make sure the content is not too long
      if (content.length > 300) {
        set.status = 400;
        return { error: 'Message content is too long' };
      }

      // Censor the message content
      const censoredContent = profanityFilter.censorText(content);

      // Check if the censored content is empty
      if (censoredContent.trim() === '' || censoredContent.replaceAll(/\*+/g, '').trim() === '') {
        set.status = 400;
        return { error: 'Message content cannot be only profanity' };
      }

      message.content = censoredContent;
      message.edited = true;
      message.time_edited = Date.now();
      await updateMessage(message);

      return { message };
    },
    {
      body: t.Object({ content: t.Optional(t.String()) }),
    }
  );

export default editMessage;
