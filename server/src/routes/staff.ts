import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware';
import {
  getAllAppeals,
  getAllReports,
  getAllUsers,
  getReportByUUID,
  getUserByUUID,
  updateReport,
  updateUser,
} from '../db';
import { getActivePunishments, punishUser } from '../../common/punishx/punishx';
import { getCategoryById } from '../../common/punishx/categories';
import { DashboardInfo } from '../../common/models/dashboardInfo';
import type { IPunishment } from '../../common/models/punishment';
import { hasPowerOver } from '../../common/roles';

const router = Router();

router.get('/dashboard', requireRole('helper'), async (req: Request, res: Response) => {
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

  const dashboardInfo: DashboardInfo = {
    totalUsers: allUsers.length,
    totalPunishments: totalPunishments,
    openReports: allReports.filter(r => r.status === 'pending').length,
    reportsLast24Hours: allReports.filter(r => twentyFourHoursAgo <= r.time_reported).length,
    punishmentsLast24Hours: allPunishments.filter(p => twentyFourHoursAgo <= p.issued_at).length,
    openAppeals: allAppeals.filter(a => a.status === 'pending').length,
    appealsLast24Hours: allAppeals.filter(a => twentyFourHoursAgo <= a.time_submitted).length,
  };

  res.status(200).json({ info: dashboardInfo });
});

router.get('/user/:uuid', requireRole('helper'), async (req: Request, res: Response) => {
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({ error: 'Missing uuid parameter' });
  }

  const user = await getUserByUUID(uuid as string);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.status(200).json({ user });
});

router.post('/users', requireRole('helper'), async (req: Request, res: Response) => {
  const { filter } = req.body as { filter?: string };

  let users = await getAllUsers();

  if (filter) {
    const lowerFilter = filter.toLowerCase();
    users = users.filter(u => u.username.toLowerCase().includes(lowerFilter));
  }

  res.status(200).json({ users });
});

router.post('/punish', requireRole('mod'), async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { target_user_uuid, category_id, reason } = req.body as {
    target_user_uuid: string;
    category_id: string;
    reason: string;
  };

  if (!target_user_uuid || !category_id || !reason) {
    return res.status(400).json({ error: 'Missing target_user_uuid, category_id, or reason' });
  }

  const targetUser = await getUserByUUID(target_user_uuid);

  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found' });
  }

  if (!hasPowerOver(user.role, targetUser.role)) {
    return res.status(403).json({ error: 'You do not have permission to punish this user' });
  }

  const category = getCategoryById(category_id);

  if (!category) {
    return res.status(404).json({ error: 'Punishment category not found' });
  }

  punishUser(targetUser, category, user.uuid, reason);
  await updateUser(targetUser);

  res.status(200).json({ message: 'User punished successfully' });
});

router.post('/pardon', requireRole('mod'), async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { target_user_uuid, punishment_uuid } = req.body as {
    target_user_uuid: string;
    punishment_uuid: string;
  };

  if (!target_user_uuid || !punishment_uuid) {
    return res.status(400).json({ error: 'Missing target_user_uuid or punishment_uuid' });
  }

  const targetUser = await getUserByUUID(target_user_uuid);

  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found' });
  }

  if (!targetUser.punishments) {
    return res.status(400).json({ error: 'Target user has no punishments' });
  }

  if (!hasPowerOver(user.role, targetUser.role)) {
    return res.status(403).json({ error: 'You do not have permission to pardon this user' });
  }

  const punishment = targetUser.punishments.find(p => p.uuid === punishment_uuid);

  if (!punishment) {
    return res.status(404).json({ error: 'Punishment not found' });
  }

  punishment.lifted_at = Date.now();
  await updateUser(targetUser);

  res.status(200).json({ message: 'Punishment lifted successfully' });
});

router.get('/reports', requireRole('mod'), async (req, res) => {
  const reports = await getAllReports();

  res.status(200).json({ reports });
});

router.post('/reports/:report_uuid/review', requireRole('mod'), async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { report_uuid } = req.params;
  const { action } = req.body as { action: 'punish_reported' | 'punish_reporter' | 'dismissed' };

  const report = await getReportByUUID(report_uuid as string);

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  report.status = action === 'dismissed' ? 'dismissed' : 'reviewed';

  await updateReport(report);

  if (action === 'punish_reported') {
    const reportedUser = await getUserByUUID(report.reported_uuid);
    if (reportedUser) {
      punishUser(
        reportedUser,
        getCategoryById(report.reason)!,
        user.uuid,
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
        user.uuid,
        'Punished via report review'
      );
      await updateUser(reporterUser);
    }
  }

  res.status(200).json({ report });
});

router.post('/reports/:report_uuid/change-category', requireRole('mod'), async (req, res) => {
  const { report_uuid } = req.params;
  const { new_category_id } = req.body as { new_category_id: string };

  const report = await getReportByUUID(report_uuid as string);

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const newCategory = getCategoryById(new_category_id);

  if (!newCategory) {
    return res.status(404).json({ error: 'New category not found' });
  }

  report.reason = new_category_id;

  await updateReport(report);

  res.status(200).json({ report });
});

export default router;
