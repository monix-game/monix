import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';
import { buildRequestLogData, log } from '../../helpers/logging';
import { punishUser } from '../../../common/punishx/punishx';
import { getCategoryById } from '../../../common/punishx/categories';
import { hasPowerOver } from '../../../common/roles';
import { formatRemainingTime } from '../../../common/math';

export const punish = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('mod'))
  .post(
    '/punish',
    async ({ body, authUser, set, request, path, headers }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { target_user_uuid, category_id, reason } = body as {
        target_user_uuid: string;
        category_id: string;
        reason: string;
      };

      if (!target_user_uuid || !category_id || !reason) {
        set.status = 400;
        return { error: 'Missing target_user_uuid, category_id, or reason' };
      }

      const targetUser = await getUserByUUID(target_user_uuid);

      if (!targetUser) {
        set.status = 404;
        return { error: 'Target user not found' };
      }

      if (!hasPowerOver(fetchedUser.role, targetUser.role)) {
        set.status = 403;
        return { error: 'You do not have permission to punish this user' };
      }

      const category = getCategoryById(category_id);

      if (!category) {
        set.status = 404;
        return { error: 'Punishment category not found' };
      }

      const punishment = punishUser(targetUser, category, fetchedUser.uuid, reason);
      await updateUser(targetUser);

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'info',
        type: 'moderation',
        message: 'User punished',
        data: buildRequestLogData(
          { path, method: request.method, headers },
          [
            { key: 'target', value: targetUser.username },
            { key: 'category', value: category.name },
            { key: 'reason', value: reason, inline: false },
            {
              key: 'duration',
              value: formatRemainingTime(category.levels[punishment.level] * 60),
            },
          ]
        ),
        username: fetchedUser.username,
      });

      return { message: 'User punished successfully' };
    },
    {
      body: t.Object({
        target_user_uuid: t.Optional(t.String()),
        category_id: t.Optional(t.String()),
        reason: t.Optional(t.String()),
      }),
    }
  );

export default punish;
