import { Router } from 'express';
import { requireAuth } from '../middleware';
import { getUserByUUID } from '../db';
import { IUser } from '../models/user';

const router = Router();

router.get('/all', requireAuth, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json({ resources: user.resources || {} });
});

router.get('/:resourceId', requireAuth, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const resourceId = req.params.resourceId;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const quantity = user.resources ? user.resources[resourceId] || 0 : 0;

  return res.status(200).json({ resourceId, quantity });
});

export default router;
