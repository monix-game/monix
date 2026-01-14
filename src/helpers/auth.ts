import { localStorageKey } from './constants';
import type { IUser } from '../../server/common/models/user';
import type { ISession } from '../../server/common/models/session';
import { api } from './api';

export async function login(username: string, password: string): Promise<boolean> {
  const data = await api.post<ISession>('/auth/login', {
    username,
    password,
  });

  if (data.success) {
    saveToken(data.data!);
    return true;
  }

  return false;
}

export async function register(username: string, password: string): Promise<boolean> {
  const data = await api.post('/auth/register', {
    username,
    password,
  });

  if (data.success) {
    return true;
  }

  return false;
}

export async function fetchUser(): Promise<IUser | null> {
  const data = await api.get<{ user: IUser }>('/auth/user');

  if (data.success) {
    return data.data!.user;
  }

  return null;
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

export function signOut() {
  localStorage.removeItem(localStorageKey('session_token'));
  localStorage.removeItem(localStorageKey('session_user_uuid'));
  localStorage.removeItem(localStorageKey('session_time_created'));
  localStorage.removeItem(localStorageKey('session_expires_at'));
}
