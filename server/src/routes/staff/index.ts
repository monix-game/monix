import { Elysia } from 'elysia';
import dashboard from './dashboard';
import logs from './logs';
import ipGeo from './ip-geo';
import getFeatures from './features-get';
import updateFeatures from './features-post';
import getUser from './user';
import listUsers from './users';
import editUser from './user-edit';
import punish from './punish';
import pardon from './pardon';
import deletePunishment from './punishment-delete';
import listReports from './reports';
import reviewReport from './report-review';
import changeReportCategory from './report-change-category';

export const staffRoutes = new Elysia()
  .use(dashboard)
  .use(logs)
  .use(ipGeo)
  .use(getFeatures)
  .use(updateFeatures)
  .use(getUser)
  .use(listUsers)
  .use(editUser)
  .use(punish)
  .use(pardon)
  .use(deletePunishment)
  .use(listReports)
  .use(reviewReport)
  .use(changeReportCategory);

export default staffRoutes;
