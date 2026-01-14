import { Router, Request, Response } from 'express';
import { getUserByUsername, createUser, createSession } from '../db';
import { IUser, userToDoc } from '../../common/models/user';
import { ISession, sessionToDoc } from '../../common/models/session';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware';
import { SESSION_EXPIRES_IN } from '../config';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { username, password } = (req.body as { username?: string; password?: string }) || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Missing username or password' });

  const existing = await getUserByUsername(username);
  if (existing) return res.status(400).json({ error: 'Username already exists' });

  const password_hash = crypto.createHash('sha256').update(String(password)).digest('hex');
  const user: IUser = {
    uuid: uuidv4(),
    username,
    password_hash,
    is_admin: false,
    is_game_mod: false,
    is_social_mod: false,
    is_helper: false,
    time_created: Date.now() / 1000,
  };

  await createUser(user);
  return res.status(201).json({ message: 'User registered successfully' });
});

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = (req.body as { username?: string; password?: string }) || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Missing username or password' });

  const user = await getUserByUsername(username);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const password_hash = crypto.createHash('sha256').update(String(password)).digest('hex');
  if (user.password_hash !== password_hash)
    return res.status(401).json({ error: 'Invalid username or password' });

  const session_token = uuidv4();
  const time_now = Date.now() / 1000;
  const session: ISession = {
    token: session_token,
    user_uuid: user.uuid,
    time_created: time_now,
    expires_at: time_now + SESSION_EXPIRES_IN,
  };
  await createSession(session);

  return res.status(200).json({ message: 'Login successful', ...sessionToDoc(session) });
});

router.get('/user', requireAuth, (req: Request, res: Response) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;

  if (!authUser) return res.status(404).json({ error: 'User not found' });

  return res.status(200).json({ user: userToDoc(authUser) });
});

export default router;
