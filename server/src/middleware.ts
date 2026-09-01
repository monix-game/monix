import {
  deleteSessionByToken,
  getGlobalSettings,
  getSessionByToken,
  getUserByUUID,
  updateUser,
} from './db';
import { hasRole } from '../common/roles';
import { isUserBanned } from '../common/punishx/punishx';
import type { IFeatureFlags } from '../common/models/globalSettings';
import type { IUser } from '../common/models/user';
import type { ISession } from '../common/models/session';
import { getRequestIp, type HeaderMap } from './helpers/ip';

type AuthResult = {
  user: IUser | null;
  session: ISession | null;
};

async function authenticateRequest(headers: HeaderMap): Promise<AuthResult> {
  const authHeader = headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, session: null };
  }

  const token = authHeader.substring(7).trim();
  const session = await getSessionByToken(token);
  if (!session) {
    return { user: null, session: null };
  }

  const user = await getUserByUUID(session.user_uuid);
  if (!user) {
    return { user: null, session: null };
  }

  const currentTime = Date.now() / 1000;
  if (session.expires_at < currentTime) {
    await deleteSessionByToken(token);
    return { user: null, session: null };
  }

  user.last_seen = Date.now();

  // Add IP to user's IP history
  const ip = getRequestIp(headers);
  if (ip) {
    user.ip_history = user.ip_history || [];
    // Only add to history if it's not the same as the last recorded IP to avoid duplicates
    if (user.ip_history.length === 0 || user.ip_history[user.ip_history.length - 1].ip !== ip) {
      user.ip_history.push({ ip, timestamp: Date.now() });
      // Keep only the last 10 IPs to prevent unbounded growth
      if (user.ip_history.length > 10) {
        user.ip_history.shift();
      }
    }
  }

  await updateUser(user);

  return { user, session };
}

/**
 * Derives `authUser` from the request headers. Apply this in each endpoint that
 * requires an authenticated user.
 */
export async function deriveAuth(
  headers: HeaderMap
): Promise<{ authUser: IUser | undefined }> {
  const { user } = await authenticateRequest(headers);
  return { authUser: user ?? undefined };
}

type GuardContext = {
  authUser?: IUser;
  set: { status?: number | string };
};

function unauthorized(set: { status?: number | string }) {
  set.status = 401;
  return { message: 'Unauthorized' };
}

/**
 * Guard: requires a valid authenticated session.
 */
export function onlyAuth({ authUser, set }: GuardContext) {
  if (!authUser) return unauthorized(set);
}

/**
 * Guard: requires an authenticated, non-banned user.
 */
export function onlyActive({ authUser, set }: GuardContext) {
  if (!authUser) return unauthorized(set);
  if (isUserBanned(authUser)) {
    set.status = 403;
    return { message: 'Forbidden' };
  }
}

/**
 * Returns a guard: requires an authenticated session with a specific role (or higher).
 */
export function onlyRole(role: 'admin' | 'mod' | 'helper') {
  return ({ authUser, set }: GuardContext) => {
    if (!authUser) return unauthorized(set);
    if (!hasRole(authUser.role, role)) {
      set.status = 401;
      return { message: 'Unauthorized' };
    }
  };
}

/**
 * Returns a guard: requires an authenticated session and a feature flag to be enabled.
 */
export function onlyFeatureEnabled(feature: keyof IFeatureFlags) {
  return async ({ authUser, set }: GuardContext) => {
    if (!authUser) return unauthorized(set);
    const settings = await getGlobalSettings();
    if (!settings.features[feature]) {
      set.status = 403;
      return { error: 'Feature disabled' };
    }
  };
}
