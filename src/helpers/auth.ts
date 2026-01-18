import { localStorageKey } from './constants';
import type { IUser } from '../../server/common/models/user';
import type { ISession } from '../../server/common/models/session';
import { api } from './api';

export async function userNeeds2FA(username: string, password: string): Promise<boolean> {
  try {
    const resp = await api.post<{ needs_2fa: boolean }>('/auth/needs-2fa', {
      username,
      password,
    });
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && typeof payload.needs_2fa === 'boolean') {
        return payload.needs_2fa;
      }
    }
    return false;
  } catch (err) {
    console.error('Error checking if user needs 2FA', err);
    return false;
  }
}

export async function login(
  username: string,
  password: string,
  twoFACode?: string
): Promise<boolean> {
  try {
    const resp = await api.post<{ session: ISession }>('/auth/login', {
      username,
      password,
      token: twoFACode,
    });
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && payload.session) {
        saveToken(payload.session);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Error logging in', err);
    return false;
  }
}

export async function register(username: string, password: string): Promise<boolean> {
  try {
    const resp = await api.post('/auth/register', {
      username,
      password,
    });
    return resp.success;
  } catch (err) {
    console.error('Error registering user', err);
    return false;
  }
}

export async function fetchUser(): Promise<IUser | null> {
  try {
    const resp = await api.get<{ user: IUser }>('/auth/user');
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && payload.user) {
        return payload.user;
      }
    }
    return null;
  } catch (err) {
    console.error('Error fetching user', err);
    return null;
  }
}

export async function setup2FA(): Promise<string | null> {
  try {
    const resp = await api.post<{ uri: string }>('/auth/setup-2fa');
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && payload.uri) {
        return payload.uri;
      }
    }
    return null;
  } catch (err) {
    console.error('Error setting up 2FA', err);
    return null;
  }
}

export async function finish2FA(token: string): Promise<boolean> {
  try {
    const resp = await api.post('/auth/finish-2fa', { token });
    return resp.success;
  } catch (err) {
    console.error('Error finishing 2FA setup', err);
    return false;
  }
}

export async function remove2FA(token: string): Promise<boolean> {
  try {
    const resp = await api.post('/auth/remove-2fa', { token });
    return resp.success;
  } catch (err) {
    console.error('Error removing 2FA', err);
    return false;
  }
}

export function logOut() {
  localStorage.removeItem(localStorageKey('session_token'));
  localStorage.removeItem(localStorageKey('session_user_uuid'));
  localStorage.removeItem(localStorageKey('session_time_created'));
  localStorage.removeItem(localStorageKey('session_expires_at'));
}

export async function logoutEverywhere(): Promise<boolean> {
  try {
    const resp = await api.post('/auth/logout');
    if (resp && resp.success) {
      logOut();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error logging out everywhere', err);
    return false;
  }
}

export async function deleteAccount(): Promise<boolean> {
  try {
    const resp = await api.post('/auth/delete');
    if (resp && resp.success) {
      logOut();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error deleting account', err);
    return false;
  }
}

function saveToken(session: ISession) {
  localStorage.setItem(localStorageKey('session_token'), session.token);
  localStorage.setItem(localStorageKey('session_user_uuid'), session.user_uuid);
  localStorage.setItem(localStorageKey('session_time_created'), session.time_created.toString());
  localStorage.setItem(localStorageKey('session_expires_at'), session.expires_at.toString());
}

export function isSignedIn(): boolean {
  const token = localStorage.getItem(localStorageKey('session_token'));
  const expiresAt = localStorage.getItem(localStorageKey('session_expires_at'));

  if (!token || !expiresAt) return false;

  const expiresAtNum = Number(expiresAt);
  const timeNow = Date.now() / 1000;

  if (isNaN(expiresAtNum) || timeNow >= expiresAtNum) {
    return false;
  }

  return true;
}
