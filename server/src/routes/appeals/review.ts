import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import {
  getAppealByUUID,
  getUserByUUID,
  updateAppeal,
  updateUser,
} from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';
import { buildRequestLogData, log } from '../../helpers/logging';

export const reviewAppeal = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('mod'))
  .post(
    '/review',
    async ({ body, authUser, set, path, request, headers }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const reviewer = await getUserByUUID(user_uuid as string);

      if (!reviewer) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { appeal_uuid, status, review_reason } = body as {
        appeal_uuid: string;
        status: 'approved' | 'denied';
        review_reason?: string;
      };

      if (!appeal_uuid || !status) {
        set.status = 400;
        return { error: 'Missing appeal_uuid or status' };
      }

      const appeal = await getAppealByUUID(appeal_uuid);
      if (!appeal) {
        set.status = 404;
        return { error: 'Appeal not found' };
      }

      if (appeal.status !== 'pending') {
        set.status = 400;
        return { error: 'Appeal has already been reviewed' };
      }

      appeal.status = status;
      appeal.reviewed_by = reviewer.uuid;
      appeal.time_reviewed = Date.now();
      appeal.review_reason = review_reason;

      await updateAppeal(appeal);

      // Remove the punishment if the appeal is approved
      if (status === 'approved') {
        const punishedUser = await getUserByUUID(appeal.user_uuid);
        if (punishedUser) {
          punishedUser.punishments ??= [];
          const punishmentIndex = punishedUser.punishments.findIndex(
            p => p.uuid === appeal.punishment_uuid
          );
          if (punishmentIndex !== -1) {
            const punishment = punishedUser.punishments[punishmentIndex];
            punishment.lifted_at = Date.now();
            await updateUser(punishedUser);
          }
        }
      }

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'info',
        type: 'appeal',
        message: 'Appeal reviewed',
        data: buildRequestLogData({ path, method: request.method, headers }, [
          { key: 'review_status', value: status },
        ]),
        username: reviewer.username,
      });

      return { message: 'Appeal reviewed successfully', appeal };
    },
    {
      body: t.Object({
        appeal_uuid: t.Optional(t.String()),
        status: t.Optional(t.String()),
        review_reason: t.Optional(t.String()),
      }),
    }
  );

export default reviewAppeal;
