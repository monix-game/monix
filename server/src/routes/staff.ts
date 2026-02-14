import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware';
import {
  getAllAppeals,
  getAllReports,
  getAllUsers,
  getGlobalSettings,
  getReportByUUID,
  getUserByUUID,
  updateGlobalSettings,
  updateReport,
  updateUser,
} from '../db';
import { processAvatar } from '../helpers/avatar';
import { getActivePunishments, punishUser } from '../../common/punishx/punishx';
import { getCategoryById } from '../../common/punishx/categories';
import { DashboardInfo } from '../../common/models/dashboardInfo';
import type { IPunishment } from '../../common/models/punishment';
import { hasPowerOver, hasRole } from '../../common/roles';
import { cosmetics } from '../../common/cosmetics/cosmetics';
import { convertToGlobalSettings, type IGlobalSettings } from '../../common/models/globalSettings';

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

router.get('/features', requireRole('admin'), async (req: Request, res: Response) => {
  const settings = await getGlobalSettings();
  res.status(200).json({ settings });
});

router.post('/features', requireRole('admin'), async (req: Request, res: Response) => {
  const { settings } = req.body as { settings?: IGlobalSettings };

  if (!settings) {
    return res.status(400).json({ error: 'Settings are required' });
  }

  const nextSettings = convertToGlobalSettings(settings);
  await updateGlobalSettings(nextSettings);

  return res.status(200).json({ settings: nextSettings });
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
    users = users.filter(
      u =>
        u.username.toLowerCase().includes(lowerFilter) || u.uuid.toLowerCase().includes(lowerFilter)
    );
  }

  res.status(200).json({ users });
});

router.post('/user/:uuid/edit', requireRole('admin'), async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { uuid } = req.params;
  if (!uuid) {
    return res.status(400).json({ error: 'Missing uuid parameter' });
  }

  const targetUser = await getUserByUUID(uuid as string);
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found' });
  }

  if (!hasPowerOver(user.role, targetUser.role) || !hasRole(targetUser.role, 'admin')) {
    return res.status(403).json({ error: 'You do not have permission to edit this user' });
  }

  const {
    money,
    gems,
    avatar_url,
    remove_avatar,
    role,
    pet_slots,
    cosmetics_unlocked,
    equipped_cosmetics,
  } = req.body as {
    money?: number;
    gems?: number;
    avatar_url?: string;
    remove_avatar?: boolean;
    role?: 'owner' | 'admin' | 'mod' | 'helper' | 'user';
    pet_slots?: number;
    cosmetics_unlocked?: string[];
    equipped_cosmetics?: {
      nameplate?: string;
      tag?: string;
      frame?: string;
    };
  };

  if (money !== undefined) {
    if (typeof money !== 'number' || !Number.isFinite(money) || money < 0) {
      return res.status(400).json({ error: 'Money must be a non-negative number' });
    }
    targetUser.money = Math.floor(money);
  }

  if (gems !== undefined) {
    if (typeof gems !== 'number' || !Number.isFinite(gems) || gems < 0) {
      return res.status(400).json({ error: 'Gems must be a non-negative number' });
    }
    targetUser.gems = Math.floor(gems);
  }

  if (role !== undefined) {
    if (!hasPowerOver(user.role, role) || role === user.role) {
      return res.status(403).json({ error: 'You do not have permission to assign this role' });
    }
    targetUser.role = role;
  }

  if (pet_slots !== undefined) {
    if (typeof pet_slots !== 'number' || !Number.isFinite(pet_slots) || pet_slots < 1) {
      return res.status(400).json({ error: 'Pet slots must be a number of 1 or more' });
    }
    targetUser.pet_slots = Math.floor(pet_slots);
  }

  if (cosmetics_unlocked !== undefined) {
    if (!Array.isArray(cosmetics_unlocked)) {
      return res.status(400).json({ error: 'Cosmetics unlocked must be an array' });
    }
    const validCosmetics = new Set(cosmetics.map(c => c.id));
    targetUser.cosmetics_unlocked = cosmetics_unlocked.filter(id => validCosmetics.has(id));
  }

  if (equipped_cosmetics !== undefined) {
    const validCosmetics = new Map(cosmetics.map(c => [c.id, c]));
    const nextEquipped: { nameplate?: string; tag?: string; frame?: string } =
      targetUser.equipped_cosmetics || {};

    const updateEquipped = (key: 'nameplate' | 'tag' | 'frame', cosmeticId?: string) => {
      if (!cosmeticId) {
        nextEquipped[key] = undefined;
        return true;
      }
      const cosmetic = validCosmetics.get(cosmeticId);
      if (cosmetic?.type !== key) {
        return false;
      }
      nextEquipped[key] = cosmeticId;
      return true;
    };

    if (!updateEquipped('nameplate', equipped_cosmetics.nameplate)) {
      return res.status(400).json({ error: 'Invalid nameplate cosmetic' });
    }
    if (!updateEquipped('tag', equipped_cosmetics.tag)) {
      return res.status(400).json({ error: 'Invalid tag cosmetic' });
    }
    if (!updateEquipped('frame', equipped_cosmetics.frame)) {
      return res.status(400).json({ error: 'Invalid frame cosmetic' });
    }

    targetUser.equipped_cosmetics = nextEquipped;
    targetUser.cosmetics_unlocked ??= [];
    const unlockedSet = new Set(targetUser.cosmetics_unlocked);
    if (nextEquipped.nameplate) unlockedSet.add(nextEquipped.nameplate);
    if (nextEquipped.tag) unlockedSet.add(nextEquipped.tag);
    if (nextEquipped.frame) unlockedSet.add(nextEquipped.frame);
    targetUser.cosmetics_unlocked = Array.from(unlockedSet);
  }

  if (remove_avatar) {
    targetUser.avatar_data_uri = undefined;
  } else if (avatar_url) {
    try {
      new URL(avatar_url);
    } catch {
      return res.status(400).json({ error: 'Invalid avatar URL' });
    }

    try {
      const processedAvatar = await processAvatar(avatar_url);
      targetUser.avatar_data_uri = processedAvatar;
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to process avatar',
      });
    }
  }

  await updateUser(targetUser);

  return res.status(200).json({ user: targetUser });
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

router.post('/punishment/delete', requireRole('mod'), async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { target_user_uuid, punishment_id } = req.body as {
    target_user_uuid: string;
    punishment_id: string;
  };

  if (!target_user_uuid || !punishment_id) {
    return res.status(400).json({ error: 'Missing target_user_uuid or punishment_id' });
  }

  const targetUser = await getUserByUUID(target_user_uuid);

  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found' });
  }

  if (!targetUser.punishments) {
    return res.status(400).json({ error: 'Target user has no punishments' });
  }

  if (!hasRole(user.role, 'admin')) {
    return res.status(403).json({ error: 'You do not have permission to delete this punishment' });
  }

  const punishmentIndex = targetUser.punishments.findIndex(p => p.uuid === punishment_id);

  if (punishmentIndex === -1) {
    return res.status(404).json({ error: 'Punishment not found' });
  }

  targetUser.punishments.splice(punishmentIndex, 1);
  await updateUser(targetUser);

  res.status(200).json({ message: 'Punishment deleted successfully' });
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
