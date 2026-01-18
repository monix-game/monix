import { localStorageKey } from './constants';
import type { IUser } from '../../server/common/models/user';
import type { ISession } from '../../server/common/models/session';
import { api } from './api';

export async function login(username: string, password: string): Promise<boolean> {
  try {
    const resp = await api.post<{ session: ISession }>('/auth/login', {
      username,
      password,
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
