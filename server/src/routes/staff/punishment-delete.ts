import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';
import { buildRequestLogData, log } from '../../helpers/logging';
import { hasRole } from '../../../common/roles';

export const deletePunishment = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('admin'))
  .post(
    '/punishment/delete',
    async ({ body, authUser, set, request, path, headers }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { target_user_uuid, punishment_id } = body as {
        target_user_uuid: string;
        punishment_id: string;
      };

      if (!target_user_uuid || !punishment_id) {
        set.status = 400;
        return { error: 'Missing target_user_uuid or punishment_id' };
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

      if (!hasRole(fetchedUser.role, 'admin')) {
        set.status = 403;
        return { error: 'You do not have permission to delete this punishment' };
      }

      const punishmentIndex = targetUser.punishments.findIndex(p => p.uuid === punishment_id);

      if (punishmentIndex === -1) {
        set.status = 404;
        return { error: 'Punishment not found' };
      }

      const punishment = targetUser.punishments[punishmentIndex];

      targetUser.punishments.splice(punishmentIndex, 1);
      await updateUser(targetUser);

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'info',
        type: 'moderation',
        message: 'Punishment deleted',
        data: buildRequestLogData(
          { path, method: request.method, headers },
          [
            { key: 'target', value: targetUser.username },
            { key: 'punishment_category', value: punishment.category.name },
          ]
        ),
        username: fetchedUser.username,
      });

      return { message: 'Punishment deleted successfully' };
    },
    {
      body: t.Object({
        target_user_uuid: t.Optional(t.String()),
        punishment_id: t.Optional(t.String()),
      }),
    }
  );

export default deletePunishment;
