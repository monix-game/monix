import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware';
import {
  createAppeal,
  getAllAppeals,
  getAppealByUUID,
  getAppealsByUserUUID,
  getUserByUUID,
  updateAppeal,
  updateUser,
} from '../db';
import { v4 } from 'uuid';
import { IAppeal } from '../../common/models/appeal';

const router = Router();

router.post('/submit', requireAuth, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser as IUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { punishment_uuid, reason } = req.body as { punishment_uuid: string; reason: string };

  if (!punishment_uuid || !reason) {
    return res.status(400).json({ error: 'Missing punishment_uuid or reason' });
  }

  const punishment = user.punishments?.find(p => p.uuid === punishment_uuid);

  if (!punishment) {
    return res.status(404).json({ error: 'Punishment not found' });
  }

  if (punishment.lifted_at) {
    return res.status(400).json({ error: 'Punishment has already been lifted' });
  }

  // Check if an appeal already exists for this punishment
  const existingAppeals = await getAppealsByUserUUID(user.uuid);
  const alreadyAppealed = existingAppeals.find(a => a.punishment_uuid === punishment_uuid);

  if (alreadyAppealed) {
    return res
      .status(400)
      .json({ error: 'An appeal for this punishment has already been submitted' });
  }

  const appeal: IAppeal = {
    uuid: v4(),
    user_uuid: user.uuid,
    punishment_uuid,
    punishment_category_id: punishment.category.id,
    reason,
    time_submitted: Date.now(),
    status: 'pending',
  };

  await createAppeal(appeal);

  return res.status(201).json({ message: 'Appeal submitted successfully', appeal });
});

router.get('/my-appeals', requireAuth, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser as IUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const appeals = await getAppealsByUserUUID(user.uuid);

  return res.status(200).json({ appeals });
});

router.get('/appeals', requireRole('mod'), async (req: Request, res: Response) => {
  const appeals = await getAllAppeals();
  return res.status(200).json({ appeals });
});

router.post('/review', requireRole('mod'), async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser as IUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { appeal_uuid, status, review_reason } = req.body as {
    appeal_uuid: string;
    status: 'approved' | 'denied';
    review_reason?: string;
  };

  if (!appeal_uuid || !status) {
    return res.status(400).json({ error: 'Missing appeal_uuid or status' });
  }

  const appeal = await getAppealByUUID(appeal_uuid);

  if (!appeal) {
    return res.status(404).json({ error: 'Appeal not found' });
  }

  if (appeal.status !== 'pending') {
    return res.status(400).json({ error: 'Appeal has already been reviewed' });
  }

  appeal.status = status;
  appeal.reviewed_by = user.uuid;
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

  return res.status(200).json({ message: 'Appeal reviewed successfully', appeal });
});

export default router;
