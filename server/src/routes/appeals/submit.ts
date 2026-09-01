import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { createAppeal, getAppealsByUserUUID, getUserByUUID } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';
import { buildRequestLogData, log } from '../../helpers/logging';
import type { IAppeal } from '../../../common/models/appeal';

export const submitAppeal = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/submit',
    async ({ body, authUser, set, path, request, headers }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { punishment_uuid, reason } = body as { punishment_uuid: string; reason: string };

      if (!punishment_uuid || !reason) {
        set.status = 400;
        return { error: 'Missing punishment_uuid or reason' };
      }

      const punishment = fetchedUser.punishments?.find(p => p.uuid === punishment_uuid);

      if (!punishment) {
        set.status = 404;
        return { error: 'Punishment not found' };
      }

      if (punishment.lifted_at) {
        set.status = 400;
        return { error: 'Punishment has already been lifted' };
      }

      // Check if an appeal already exists for this punishment
      const existingAppeals = await getAppealsByUserUUID(fetchedUser.uuid);
      const alreadyAppealed = existingAppeals.find(a => a.punishment_uuid === punishment_uuid);

      if (alreadyAppealed) {
        set.status = 400;
        return { error: 'An appeal for this punishment has already been submitted' };
      }

      const appeal: IAppeal = {
        uuid: v4(),
        user_uuid: fetchedUser.uuid,
        punishment_uuid,
        punishment_category_id: punishment.category.id,
        reason,
        time_submitted: Date.now(),
        status: 'pending',
      };

      await createAppeal(appeal);

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'info',
        type: 'appeal',
        message: 'Appeal submitted',
        data: buildRequestLogData(
          { path, method: request.method, headers },
          [
            { key: 'submitter', value: fetchedUser.username },
            { key: 'punishment_category', value: punishment.category.name },
          ]
        ),
        username: fetchedUser.username,
      });

      set.status = 201;
      return { message: 'Appeal submitted successfully', appeal };
    },
    {
      body: t.Object({
        punishment_uuid: t.Optional(t.String()),
        reason: t.Optional(t.String()),
      }),
    }
  );

export default submitAppeal;
