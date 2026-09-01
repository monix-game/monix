import { Elysia } from 'elysia';
import { getAllAppeals, getAllReports, getAllUsers } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';
import { getActivePunishments } from '../../../common/punishx/punishx';
import type { IPunishment } from '../../../common/models/punishment';
import type { DashboardInfo } from '../../../common/models/dashboardInfo';

export const dashboard = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('helper'))
  .get('/dashboard', async () => {
    const allUsers = await getAllUsers();
    const allReports = await getAllReports();
    const allAppeals = await getAllAppeals();

    let totalPunishments = 0;
    let allPunishments: IPunishment[] = [];
    allUsers.forEach(user => {
      const activePunishments = getActivePunishments(user);
      totalPunishments += activePunishments.length;
      allPunishments = allPunishments.concat(activePunishments);
    });

    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    const info: DashboardInfo = {
      totalUsers: allUsers.length,
      totalPunishments: totalPunishments,
      openReports: allReports.filter(r => r.status === 'pending').length,
      reportsLast24Hours: allReports.filter(r => twentyFourHoursAgo <= r.time_reported).length,
      punishmentsLast24Hours: allPunishments.filter(p => twentyFourHoursAgo <= p.issued_at).length,
      openAppeals: allAppeals.filter(a => a.status === 'pending').length,
      appealsLast24Hours: allAppeals.filter(a => twentyFourHoursAgo <= a.time_submitted).length,
    };

    return { info };
  });

export default dashboard;
