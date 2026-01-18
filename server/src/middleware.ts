import { NextFunction, Request, Response } from 'express';
import { deleteSessionByToken, getSessionByToken, getUserByUUID } from './db';

const HIERARCHY = ['admin', 'game_mod', 'social_mod', 'helper'];

async function authenticateRequest(req: Request, res: Response) {
  const unauthorized = () => {
    res.status(401).json({ message: 'Unauthorized' });
  };

  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    unauthorized();
    return null;
  }

  const token = authHeader.substring(7).trim();
  const session = await getSessionByToken(token);
  if (!session) {
    unauthorized();
    return null;
  }

  const user = await getUserByUUID(session.user_uuid);
  if (!user) {
    unauthorized();
    return null;
  }

  const currentTime = Date.now() / 1000;
  if (session.expires_at < currentTime) {
    unauthorized();
    await deleteSessionByToken(token);
    return null;
  }

  // @ts-expect-error We are adding a custom property to the Request object
  req.authUser = user;
  // @ts-expect-error We are adding a custom property to the Request object
  req.authSession = session;

  return user;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await authenticateRequest(req, res);
  if (!user) return;
  next();
}

export function requireRole(role: 'admin' | 'game_mod' | 'social_mod' | 'helper') {
  return async function (req: Request, res: Response, next: NextFunction) {
    const user = await authenticateRequest(req, res);
    if (!user) return;

    if (!HIERARCHY.includes(role)) {
      // Not staff role, automatically unauthorized
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userRoleIndex = HIERARCHY.indexOf(user.role);
    const requiredRoleIndex = HIERARCHY.indexOf(role);

    if (userRoleIndex > requiredRoleIndex) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    next();
  };
}
