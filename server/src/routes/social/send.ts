import { Elysia, t } from 'elysia';
import { getRoomByUUID, getUserByUUID } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { sendChatMessage } from '../../helpers/chat';
import { markChatChannelDirty } from '../../socket';

export const sendMessage = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/send',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { room_uuid, content } = body as { room_uuid: string; content: string };
      const room = await getRoomByUUID(room_uuid || '');

      const result = await sendChatMessage(fetchedUser, room ?? null, room_uuid || '', content || '');

      set.status = result.status;
      if (!result.ok) {
        return { error: result.message };
      }
      markChatChannelDirty(room_uuid || '');
      return { message: result.message };
    },
    {
      body: t.Object({
        room_uuid: t.Optional(t.String()),
        content: t.Optional(t.String()),
      }),
    }
  );

export default sendMessage;