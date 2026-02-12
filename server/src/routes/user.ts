import { Router, Request, Response } from 'express';
import {
  getUserByUsername,
  createUser,
  createSession,
  deleteSessionsByUserUUID,
  deleteUserByUUID,
  deletePetsByOwnerUUID,
  updateUser,
  getUserByUUID,
} from '../db';
import { type IUser, userToDoc } from '../../common/models/user';
import { ISession, sessionToDoc } from '../../common/models/session';
import crypto from 'node:crypto';
import { v4 } from 'uuid';
import { requireActive, requireAuth } from '../middleware';
import { SESSION_EXPIRES_IN, profanityFilter } from '../constants';
import { DEFAULT_SETTINGS } from '../../common/models/settings';
import { createSecret, getTOTPURI, verifyTOTPToken } from '../helpers/totp';
import { cosmetics } from '../../common/cosmetics/cosmetics';
import { processAvatar } from '../helpers/avatar';
import { DAILY_REWARDS } from '../../common/rewards/dailyRewards';
import { applyAquariumEventModifiers, getCurrentFishingEvent } from '../../common/fishing/fishing';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { username, password } = (req.body as { username?: string; password?: string }) || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  const existing = await getUserByUsername(username);
  if (existing) return res.status(400).json({ error: 'Username already exists' });

  // Make sure username is 3-15 characters and only contains letters, numbers, underscores, hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]{3,15}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({
      error:
        'Invalid username. Usernames can only contain letters, numbers, underscores, and hyphens, and must be between 3 and 15 characters long.',
    });
  }

  // Make sure password is at least 6 characters
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  // Make sure the username isn't profane
  if (profanityFilter.isProfane(username)) {
    return res.status(400).json({ error: 'Username contains inappropriate language' });
  }

  const password_hash = crypto.createHash('sha256').update(String(password)).digest('hex');
  const user: IUser = {
    uuid: v4(),
    username,
    password_hash,
    money: 1000,
    gems: 0,
    pet_slots: 3,
    daily_rewards: { last_claimed_day: 0, streak: 0 },
    completed_tutorial: false,
    role: 'user',
    time_created: Date.now() / 1000,
    last_seen: Date.now() / 1000,
    settings: DEFAULT_SETTINGS,
    resources: {},
  };

  await createUser(user);
  return res.status(201).json({ message: 'User registered successfully' });
});

router.post('/login', async (req: Request, res: Response) => {
  const { username, password, token } =
    (req.body as { username?: string; password?: string; token?: string }) || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Missing username or password' });

  const user = await getUserByUsername(username);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const password_hash = crypto.createHash('sha256').update(String(password)).digest('hex');
  if (user.password_hash !== password_hash)
    return res.status(401).json({ error: 'Invalid username or password' });

  if (user.setup_totp) {
    if (!token) {
      return res.status(400).json({ error: '2FA token required' });
    }

    const isTokenValid = verifyTOTPToken(user.totp_secret!, token);
    if (!isTokenValid) {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }
  }

  const session_token = v4();
  const time_now = Date.now() / 1000;
  const session: ISession = {
    token: session_token,
    user_uuid: user.uuid,
    time_created: time_now,
    expires_at: time_now + SESSION_EXPIRES_IN,
  };
  await createSession(session);

  return res.status(200).json({ message: 'Login successful', session: sessionToDoc(session) });
});

router.post('/needs-2fa', async (req: Request, res: Response) => {
  const { username, password } = (req.body as { username?: string; password?: string }) || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Missing username or password' });

  const user = await getUserByUsername(username);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const password_hash = crypto.createHash('sha256').update(String(password)).digest('hex');
  if (user.password_hash !== password_hash)
    return res.status(401).json({ error: 'Invalid username or password' });

  return res.status(200).json({ needs_2fa: user.setup_totp });
});

router.post('/setup-2fa', requireAuth, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  const secret = createSecret();

  authUser.totp_secret = secret;
  await updateUser(authUser);

  const uri = getTOTPURI(secret, authUser.username);

  return res.status(200).json({ message: 'Setup 2FA successfully', uri });
});

router.post('/finish-2fa', requireAuth, async (req: Request, res: Response) => {
  const { token } = (req.body as { token?: string }) || {};
  if (!token) return res.status(400).json({ error: 'Missing 2FA token' });

  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });
  if (!authUser.totp_secret) return res.status(400).json({ error: '2FA not set up' });
  if (authUser.setup_totp) return res.status(400).json({ error: '2FA already set up' });

  const isTokenValid = verifyTOTPToken(authUser.totp_secret, token);
  if (!isTokenValid) {
    return res.status(401).json({ error: 'Invalid 2FA token' });
  }

  authUser.setup_totp = true;
  await updateUser(authUser);

  return res.status(200).json({ message: '2FA setup completed successfully' });
});

router.post('/remove-2fa', requireAuth, async (req: Request, res: Response) => {
  const { token } = (req.body as { token?: string }) || {};
  if (!token) return res.status(400).json({ error: 'Missing 2FA token' });

  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });
  if (!authUser.totp_secret || !authUser.setup_totp)
    return res.status(400).json({ error: '2FA not set up' });

  const isTokenValid = verifyTOTPToken(authUser.totp_secret, token);
  if (!isTokenValid) {
    return res.status(401).json({ error: 'Invalid 2FA token' });
  }

  authUser.totp_secret = undefined;
  authUser.setup_totp = false;
  await updateUser(authUser);

  return res.status(200).json({ message: '2FA removed successfully' });
});

router.get('/user', requireAuth, (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  const currentEvent = getCurrentFishingEvent();
  const aquariumFish = authUser.fishing?.aquarium?.fish ?? [];
  if (applyAquariumEventModifiers(aquariumFish, currentEvent)) {
    void updateUser(authUser);
  }

  return res.status(200).json({ user: userToDoc(authUser) });
});

router.post('/daily-reward/claim', requireActive, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  const currentDay = Math.floor(Date.now() / 86400000);
  const dailyRewardsState = authUser.daily_rewards || { last_claimed_day: 0, streak: 0 };
  const lastClaimedDay = dailyRewardsState.last_claimed_day || 0;
  const lastStreak = dailyRewardsState.streak || 0;

  if (lastClaimedDay === currentDay) {
    return res.status(200).json({ claimed: false, streak: lastStreak });
  }

  const isConsecutive = lastClaimedDay === currentDay - 1;
  let newStreak = isConsecutive ? lastStreak + 1 : 1;
  if (newStreak > DAILY_REWARDS.length) {
    newStreak = 1;
  }

  const reward = DAILY_REWARDS[newStreak - 1];
  if (reward.type === 'money') {
    authUser.money += reward.amount;
  } else {
    authUser.gems += reward.amount;
  }

  authUser.daily_rewards = { last_claimed_day: currentDay, streak: newStreak };
  await updateUser(authUser);

  return res.status(200).json({ claimed: true, streak: newStreak, reward });
});

router.post('/tutorial/complete', requireAuth, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  if (!authUser.completed_tutorial) {
    authUser.completed_tutorial = true;
    await updateUser(authUser);
  }

  return res.status(200).json({ message: 'Tutorial completed' });
});

router.post('/tutorial/reset', requireAuth, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  if (authUser.completed_tutorial) {
    authUser.completed_tutorial = false;
    await updateUser(authUser);
  }

  return res.status(200).json({ message: 'Tutorial reset' });
});

router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  await deleteSessionsByUserUUID(authUser.uuid);

  return res.status(200).json({ message: 'All sessions logged out successfully' });
});

router.post('/delete', requireAuth, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  // Deleting user sessions
  await deleteSessionsByUserUUID(authUser.uuid);

  // Deleting user pets
  await deletePetsByOwnerUUID(authUser.uuid);

  // Deleting user
  await deleteUserByUUID(authUser.uuid);

  return res.status(200).json({ message: 'User account deleted successfully' });
});

router.post('/upload/avatar', requireActive, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  const { avatar_url } = (req.body as { avatar_url?: string }) || {};

  if (!avatar_url) return res.status(400).json({ error: 'Missing avatar URL' });

  // Simple URL validation
  try {
    new URL(avatar_url);
  } catch {
    return res.status(400).json({ error: 'Invalid avatar URL' });
  }

  // Process the avatar: crop to square if needed and convert to data URI
  try {
    const processedAvatar = await processAvatar(avatar_url);
    authUser.avatar_data_uri = processedAvatar;
    await updateUser(authUser);

    return res.status(200).json({ message: 'Avatar updated successfully' });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to process avatar',
    });
  }
});

router.post('/remove/avatar', requireAuth, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  authUser.avatar_data_uri = undefined;
  await updateUser(authUser);

  return res.status(200).json({ message: 'Avatar removed successfully' });
});

router.post('/change/password', requireAuth, async (req: Request, res: Response) => {
  const { old_password, new_password } =
    (req.body as { old_password?: string; new_password?: string }) || {};
  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'Missing old or new password' });
  }

  if (old_password === new_password) {
    return res.status(400).json({ error: 'New password must be different from old password' });
  }

  if (typeof new_password !== 'string') {
    return res.status(400).json({ error: 'New password must be a string' });
  }

  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  const old_password_hash = crypto.createHash('sha256').update(String(old_password)).digest('hex');
  if (authUser.password_hash !== old_password_hash) {
    return res.status(401).json({ error: 'Old password is incorrect' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const new_password_hash = crypto.createHash('sha256').update(String(new_password)).digest('hex');
  authUser.password_hash = new_password_hash;
  await updateUser(authUser);

  return res.status(200).json({ message: 'Password changed successfully' });
});

router.post('/cosmetics/buy', requireAuth, async (req: Request, res: Response) => {
  const { cosmetic_id } = (req.body as { cosmetic_id?: string }) || {};
  if (!cosmetic_id) return res.status(400).json({ error: 'Missing cosmetic ID' });

  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  const user = await getUserByUUID(authUser.uuid);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const cosmetic = cosmetics.find(c => c.id === cosmetic_id && c.buyable);
  if (!cosmetic) return res.status(404).json({ error: 'Cosmetic not found or not buyable' });

  if (user.cosmetics_unlocked?.includes(cosmetic_id)) {
    return res.status(400).json({ error: 'Cosmetic already unlocked' });
  }

  if (!cosmetic.price) {
    return res.status(400).json({ error: 'Cosmetic has no price' });
  }

  if (user.gems !== -1 && user.gems < cosmetic.price) {
    return res.status(400).json({ error: 'Insufficient gems' });
  }

  if (user.gems !== -1) {
    user.gems -= cosmetic.price;
  }

  user.cosmetics_unlocked = user.cosmetics_unlocked || [];
  user.cosmetics_unlocked.push(cosmetic_id);

  await updateUser(user);

  return res.status(200).json({ message: 'Cosmetic purchased successfully' });
});

router.post('/cosmetics/equip', requireAuth, async (req: Request, res: Response) => {
  const { cosmetic_id } = (req.body as { cosmetic_id?: string }) || {};
  if (!cosmetic_id) return res.status(400).json({ error: 'Missing cosmetic ID' });

  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  const user = await getUserByUUID(authUser.uuid);

  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.cosmetics_unlocked?.includes(cosmetic_id)) {
    return res.status(400).json({ error: 'Cosmetic not unlocked' });
  }

  const cosmetic = cosmetics.find(c => c.id === cosmetic_id);
  if (!cosmetic) return res.status(404).json({ error: 'Cosmetic not found' });

  user.equipped_cosmetics ??= {};

  if (cosmetic.type === 'nameplate') {
    user.equipped_cosmetics.nameplate = cosmetic.id;
  } else if (cosmetic.type === 'tag') {
    user.equipped_cosmetics.tag = cosmetic.id;
  } else if (cosmetic.type === 'frame') {
    user.equipped_cosmetics.frame = cosmetic.id;
  } else {
    return res.status(400).json({ error: 'Invalid cosmetic type' });
  }

  await updateUser(user);

  return res.status(200).json({ message: 'Cosmetic equipped successfully' });
});

router.post('/cosmetics/unequip', requireAuth, async (req: Request, res: Response) => {
  const { cosmetic_type } = (req.body as { cosmetic_type?: string }) || {};
  if (!cosmetic_type) return res.status(400).json({ error: 'Missing cosmetic type' });

  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  const user = await getUserByUUID(authUser.uuid);

  if (!user) return res.status(404).json({ error: 'User not found' });

  user.equipped_cosmetics ??= {};

  if (cosmetic_type === 'nameplate') {
    user.equipped_cosmetics.nameplate = undefined;
  } else if (cosmetic_type === 'tag') {
    user.equipped_cosmetics.tag = undefined;
  } else if (cosmetic_type === 'frame') {
    user.equipped_cosmetics.frame = undefined;
  } else {
    return res.status(400).json({ error: 'Invalid cosmetic type' });
  }

  await updateUser(user);

  return res.status(200).json({ message: 'Cosmetic unequipped successfully' });
});

export default router;
