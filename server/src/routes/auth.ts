import { Router, Request, Response } from 'express';
import {
  getUserByUsername,
  createUser,
  createSession,
  deleteSessionsByUserUUID,
  deleteUserByUUID,
  deletePetsByOwnerUUID,
  updateUser,
} from '../db';
import { type IUser, userToDoc } from '../../common/models/user';
import { ISession, sessionToDoc } from '../../common/models/session';
import crypto from 'crypto';
import { v4 } from 'uuid';
import { requireAuth } from '../middleware';
import { SESSION_EXPIRES_IN } from '../index';
import { DEFAULT_SETTINGS } from '../../common/models/settings';
import { createSecret, getTOTPURI, verifyTOTPToken } from '../helpers/totp';

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

  const password_hash = crypto.createHash('sha256').update(String(password)).digest('hex');
  const user: IUser = {
    uuid: v4(),
    username,
    password_hash,
    money: 1000,
    role: 'user',
    time_created: Date.now() / 1000,
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

  if (user.totp_secret) {
    if (!token) {
      return res.status(400).json({ error: '2FA token required' });
    }

    const isTokenValid = await verifyTOTPToken(user.totp_secret, token);
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

  return res.status(200).json({ needs_2fa: Boolean(user.totp_secret && user.setup_totp) });
});

router.post('/setup-2fa', requireAuth, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  const secret = createSecret();

  authUser.totp_secret = secret;
  await updateUser(authUser);

  const uri = getTOTPURI(secret, authUser.username, 'Monix');

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

  const isTokenValid = await verifyTOTPToken(authUser.totp_secret, token);
  if (!isTokenValid) {
    return res.status(401).json({ error: 'Invalid 2FA token' });
  }

  authUser.setup_totp = true;
  await updateUser(authUser);

  return res.status(200).json({ message: '2FA setup completed successfully' });
});

router.get('/user', requireAuth, (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  return res.status(200).json({ user: userToDoc(authUser) });
});

router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(400).json({ error: 'No active user found' });

  await deleteSessionsByUserUUID(authUser.uuid);

  return res.status(200).json({ message: 'All sessions logged out successfully' });
});

router.post('/delete', requireAuth, async (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(400).json({ error: 'No active user found' });

  // Deleting user sessions
  await deleteSessionsByUserUUID(authUser.uuid);

  // Deleting user pets
  await deletePetsByOwnerUUID(authUser.uuid);

  // Deleting user
  await deleteUserByUUID(authUser.uuid);

  return res.status(200).json({ message: 'User account deleted successfully' });
});

export default router;
