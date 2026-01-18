import { Router } from 'express';
import { requireAuth } from '../middleware';
import { getUserByUUID, updateUser } from '../db';
import { type IUser } from '../models/user';
import { convertToSettings, type ISettings } from '../../common/models/settings';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);
  const { settings } = req.body as { settings: ISettings };

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!settings) {
    return res.status(400).json({ error: 'Settings are required' });
  }

  user.settings = convertToSettings(settings);
  await updateUser(user);

  return res.status(200).json({ message: 'Settings updated successfully' });
});

router.post('/set', requireAuth, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const { key, value } = req.body as { key: keyof ISettings; value: any };

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (key === undefined || value === undefined) {
    return res.status(400).json({ error: 'Key and value are required' });
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const settings = { ...user.settings, [key]: value };

  user.settings = convertToSettings(settings);
  await updateUser(user);

  return res.status(200).json({ message: 'Settings updated successfully' });
});

export default router;
