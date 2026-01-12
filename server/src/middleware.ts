import { NextFunction, Request, Response } from "express";
import { getSessionByToken, getUserByUUID } from "./db";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const fail = () => {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  };

  if (!req.headers["authorization"]) fail();
  if (!req.headers["authorization"]!.startsWith('Bearer ')) fail();

  const token = req.headers["authorization"]!.substring(7).trim();
  const session = await getSessionByToken(token);

  if (session === null) fail();

  const user = await getUserByUUID(session!.user_uuid);

  if (user === null) fail();

  // @ts-ignore
  req.authUser = user!;
  next();
}

export async function requireAuthedAdmin(req: Request, res: Response, next: NextFunction) {
  const fail = () => {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  };

  if (!req.headers["authorization"]) fail();
  if (!req.headers["authorization"]!.startsWith('Bearer ')) fail();

  const token = req.headers["authorization"]!.substring(7).trim();
  const session = await getSessionByToken(token);

  if (session === null) fail();

  const user = await getUserByUUID(session!.user_uuid);

  if (user === null) fail();
  if (!user?.is_admin) fail();

  // @ts-ignore
  req.authUser = user!;
  next();
}
