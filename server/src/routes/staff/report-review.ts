import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { getReportByUUID, getUserByUUID, updateReport, updateUser } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';
import { buildRequestLogData, log } from '../../helpers/logging';
import { punishUser } from '../../../common/punishx/punishx';
import { getCategoryById } from '../../../common/punishx/categories';

export const reviewReport = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('mod'))
  .post(
    '/reports/:report_uuid/review',
    async ({ params, body, authUser, set, request, path, headers }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { report_uuid } = params;
      const { action } = body as { action: 'punish_reported' | 'punish_reporter' | 'dismissed' };

      const report = await getReportByUUID(report_uuid);

      if (!report) {
        set.status = 404;
        return { error: 'Report not found' };
      }

      report.status = action === 'dismissed' ? 'dismissed' : 'reviewed';

      await updateReport(report);

      if (action === 'punish_reported') {
        const reportedUser = await getUserByUUID(report.reported_uuid);
        if (reportedUser) {
          punishUser(
            reportedUser,
            getCategoryById(report.reason)!,
            fetchedUser.uuid,
            'Punished via report review'
          );
          await updateUser(reportedUser);
        }
      } else if (action === 'punish_reporter') {
        const reporterUser = await getUserByUUID(report.reporter_uuid);
        if (reporterUser) {
          punishUser(
            reporterUser,
            getCategoryById('game/systems/false-reporting')!,
            fetchedUser.uuid,
            'Punished via report review'
          );
          await updateUser(reporterUser);
        }
      }

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'info',
        type: 'report',
        message: 'Report reviewed',
        data: buildRequestLogData(
          { path, method: request.method, headers },
          [
            { key: 'report_category', value: report.reason },
            { key: 'action', value: action },
          ]
        ),
        username: fetchedUser.username,
      });

      return { report };
    },
    {
      body: t.Object({
        action: t.Optional(t.Union([t.Literal('punish_reported'), t.Literal('punish_reporter'), t.Literal('dismissed')])),
      }),
    }
  );

export default reviewReport;
