import { Router } from 'express';
import { requireAuth } from '../middleware';
import { getUserByUUID } from '../db';
import { type IUser } from '../models/user';

const router = Router();

router.get('/aquarium', requireAuth, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const aquarium = user.fishing?.aquarium || { capacity: 10, fish: [] };

  return res.status(200).json({ aquarium });
});

export default router;
