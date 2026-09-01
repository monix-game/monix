import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { getReportByUUID, getUserByUUID, updateReport } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';
import { buildRequestLogData, log } from '../../helpers/logging';
import { getCategoryById, punishXCategories } from '../../../common/punishx/categories';

export const changeReportCategory = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('mod'))
  .post(
    '/reports/:report_uuid/change-category',
    async ({ params, body, authUser, set, request, path, headers }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { report_uuid } = params;
      const { new_category_id } = body as { new_category_id: string };

      const report = await getReportByUUID(report_uuid);

      if (!report) {
        set.status = 404;
        return { error: 'Report not found' };
      }

      const newCategory = getCategoryById(new_category_id);

      if (!newCategory) {
        set.status = 404;
        return { error: 'New category not found' };
      }

      const originalCategory = report.reason;
      report.reason = new_category_id;

      await updateReport(report);

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'info',
        type: 'report',
        message: 'Report category changed',
        data: buildRequestLogData(
          { path, method: request.method, headers },
          [
            { key: 'original_category', value: originalCategory },
            {
              key: 'new_category',
              value: punishXCategories.find(c => c.id === new_category_id)?.name || new_category_id,
            },
          ]
        ),
        username: fetchedUser.username,
      });

      return { report };
    },
    {
      body: t.Object({ new_category_id: t.Optional(t.String()) }),
    }
  );

export default changeReportCategory;
