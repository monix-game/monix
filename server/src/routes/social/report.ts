import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { createReport, getMessageByUUID, getUserByUUID } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { getCategoryById } from '../../../common/punishx/categories';
import { hasRole } from '../../../common/roles';
import type { IReport } from '../../../common/models/report';

export const reportMessage = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/report',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { message_uuid, reason, details } = body as {
        message_uuid: string;
        reason: string;
        details?: string;
      };

      if (!message_uuid || !reason) {
        set.status = 400;
        return { error: 'Missing message_uuid or reason' };
      }

      const message = await getMessageByUUID(message_uuid);

      if (!message) {
        set.status = 404;
        return { error: 'Message not found' };
      }

      if (message.ephemeral || message.sender_uuid === 'nyx') {
        set.status = 403;
        return { error: 'You are not allowed to report this message' };
      }

      if (message.sender_uuid === fetchedUser.uuid) {
        set.status = 403;
        return { error: 'You cannot report your own message' };
      }

      const reportedUser = await getUserByUUID(message.sender_uuid);

      if (!reportedUser) {
        set.status = 404;
        return { error: 'Reported user not found' };
      }

      const category = getCategoryById(reason);

      if (!category) {
        set.status = 404;
        return { error: 'Invalid report reason' };
      }

      if (!category.id.startsWith('social')) {
        set.status = 400;
        return { error: 'Report reason is not valid for social reports' };
      }

      if (hasRole(reportedUser.role, 'admin')) {
        set.status = 400;
        return { error: 'Cannot report this message' };
      }

      const report: IReport = {
        uuid: v4(),
        reporter_uuid: fetchedUser.uuid,
        message_uuid,
        message_content: message.content,
        reported_uuid: reportedUser.uuid,
        reason: category.id,
        details,
        status: 'pending',
        time_reported: Date.now(),
      };

      await createReport(report);

      set.status = 201;
      return { report };
    },
    {
      body: t.Object({
        message_uuid: t.Optional(t.String()),
        reason: t.Optional(t.String()),
        details: t.Optional(t.String()),
      }),
    }
  );

export default reportMessage;
