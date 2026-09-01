import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';
import { buildRequestLogData, log } from '../../helpers/logging';
import { hasPowerOver } from '../../../common/roles';

export const pardon = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('admin'))
  .post(
    '/pardon',
    async ({ body, authUser, set, request, path, headers }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { target_user_uuid, punishment_uuid } = body as {
        target_user_uuid: string;
        punishment_uuid: string;
      };

      if (!target_user_uuid || !punishment_uuid) {
        set.status = 400;
        return { error: 'Missing target_user_uuid or punishment_uuid' };
      }

      const targetUser = await getUserByUUID(target_user_uuid);

      if (!targetUser) {
        set.status = 404;
        return { error: 'Target user not found' };
      }

      if (!targetUser.punishments) {
        set.status = 400;
        return { error: 'Target user has no punishments' };
      }

      if (!hasPowerOver(fetchedUser.role, targetUser.role)) {
        set.status = 403;
        return { error: 'You do not have permission to pardon this user' };
      }

      const punishment = targetUser.punishments.find(p => p.uuid === punishment_uuid);

      if (!punishment) {
        set.status = 404;
        return { error: 'Punishment not found' };
      }

      punishment.lifted_at = Date.now();
      await updateUser(targetUser);

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'info',
        type: 'moderation',
        message: 'Punishment lifted',
        data: buildRequestLogData(
          { path, method: request.method, headers },
          [
            { key: 'target', value: targetUser.username },
            { key: 'punishment_category', value: punishment.category.name },
          ]
        ),
        username: fetchedUser.username,
      });

      return { message: 'Punishment lifted successfully' };
    },
    {
      body: t.Object({
        target_user_uuid: t.Optional(t.String()),
        punishment_uuid: t.Optional(t.String()),
      }),
    }
  );

export default pardon;
