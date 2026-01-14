import { NextFunction, Request, Response } from 'express';
import { getSessionByToken, getUserByUUID } from './db';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const fail = () => {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  };

  if (!req.headers['authorization']) fail();
  if (!req.headers['authorization']!.startsWith('Bearer ')) fail();

  const token = req.headers['authorization']!.substring(7).trim();
  const session = await getSessionByToken(token);

  if (session === null) fail();

  const user = await getUserByUUID(session!.user_uuid);

  if (user === null) fail();

  // @ts-expect-error We are adding authUser to req
  req.authUser = user!;

  next();
}

export function requireRole(role: 'admin' | 'game_mod' | 'social_mod' | 'helper') {
  return async function (req: Request, res: Response, next: NextFunction) {
    const fail = () => {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    };

    if (!req.headers['authorization']) fail();
    if (!req.headers['authorization']!.startsWith('Bearer ')) fail();

    const token = req.headers['authorization']!.substring(7).trim();
    const session = await getSessionByToken(token);

    if (session === null) fail();

    const user = await getUserByUUID(session!.user_uuid);

    if (user === null) fail();

    if (role === 'admin' && !user!.is_admin) fail();
    if (role === 'game_mod' && !user!.is_game_mod) fail();
    if (role === 'social_mod' && !user!.is_social_mod) fail();
    if (role === 'helper' && !user!.is_helper) fail();

    // @ts-expect-error We are adding authUser to req
    req.authUser = user!;

    next();
  };
}
