import { NextFunction, Request, Response } from 'express';
import { deleteSessionByToken, getSessionByToken, getUserByUUID } from './db';
import { hasRole } from '../common/roles';
import { isUserBanned } from '../common/punishx/punishx';

const SUBSCRIPTION_HIERARCHY = ['pro', 'plus'];

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

export async function requireActive(req: Request, res: Response, next: NextFunction) {
  const user = await authenticateRequest(req, res);
  if (!user) return;

  if (isUserBanned(user)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  next();
}

export function requireSubscription(subscription: 'plus' | 'pro') {
  return async function (req: Request, res: Response, next: NextFunction) {
    const user = await authenticateRequest(req, res);
    if (!user) return;

    const currentTime = Date.now() / 1000;
    const payment = user.payment;

    if (!payment || !payment.current_subscription || !payment.subscription_expires_at) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (payment.subscription_expires_at < currentTime) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userSubscriptionIndex = SUBSCRIPTION_HIERARCHY.indexOf(payment.current_subscription);
    const requiredSubscriptionIndex = SUBSCRIPTION_HIERARCHY.indexOf(subscription);

    if (userSubscriptionIndex < requiredSubscriptionIndex) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    next();
  };
}

export function requireRole(role: 'admin' | 'mod' | 'helper') {
  return async function (req: Request, res: Response, next: NextFunction) {
    const user = await authenticateRequest(req, res);
    if (!user) return;

    const hasRoleResult = hasRole(user.role, role);

    if (!hasRoleResult) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    next();
  };
}
