import { localStorageKey } from './constants';
import type { IUser } from '../../server/common/models/user';
import type { ISession } from '../../server/common/models/session';
import { api } from './api';

export async function userNeeds2FA(username: string, password: string): Promise<boolean> {
  try {
    const resp = await api.post<{ needs_2fa: boolean }>('/user/needs-2fa', {
      username,
      password,
    });
    if (resp?.success) {
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
    const resp = await api.post<{ session: ISession }>('/user/login', {
      username,
      password,
      token: twoFACode,
    });
    if (resp?.success) {
      const payload = resp.data;
      if (payload?.session) {
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
    const resp = await api.post('/user/register', {
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
    const resp = await api.get<{ user: IUser }>('/user/user');
    if (resp?.success && resp.data) {
      return resp.data.user;
    }
    return null;
  } catch (err) {
    console.error('Error fetching user', err);
    return null;
  }
}

export async function setup2FA(): Promise<string | null> {
  try {
    const resp = await api.post<{ uri: string }>('/user/setup-2fa');
    if (resp?.success && resp.data) {
      return resp.data.uri;
    }
    return null;
  } catch (err) {
    console.error('Error setting up 2FA', err);
    return null;
  }
}

export async function finish2FA(token: string): Promise<boolean> {
  try {
    const resp = await api.post('/user/finish-2fa', { token });
    return resp.success;
  } catch (err) {
    console.error('Error finishing 2FA setup', err);
    return false;
  }
}

export async function remove2FA(token: string): Promise<boolean> {
  try {
    const resp = await api.post('/user/remove-2fa', { token });
    return resp.success;
  } catch (err) {
    console.error('Error removing 2FA', err);
    return false;
  }
}

export async function uploadAvatar(file: File): Promise<boolean> {
  try {
    // Convert file to 500x500 PNG
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = () => reject(new Error('Failed to load image'));
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const size = 500;
    canvas.width = size;
    canvas.height = size;

    // Draw transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, size, size);

    // Calculate aspect ratio and draw image centered
    let drawWidth = size;
    let drawHeight = size;
    let offsetX = 0;
    let offsetY = 0;

    if (img.width > img.height) {
      drawHeight = (img.height / img.width) * size;
      offsetY = (size - drawHeight) / 2;
    } else {
      drawWidth = (img.width / img.height) * size;
      offsetX = (size - drawWidth) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // Convert canvas to Blob
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        b => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error('Failed to convert canvas to Blob'));
          }
        },
        'image/png',
        0.9
      );
    });

    const processedFile = new File([blob], 'avatar.png', { type: 'image/png' });

    // Convert file to data URI
    const reader = new FileReader();
    const dataURI: string = await new Promise((resolve, reject) => {
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as data URI'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      reader.readAsDataURL(processedFile);
    });

    const resp = await api.post('/user/upload/avatar', { avatar_url: dataURI });
    return resp.success;
  } catch (err) {
    console.error('Error uploading avatar', err);
    return false;
  }
}

export async function removeAvatar(): Promise<boolean> {
  try {
    const resp = await api.post('/user/remove/avatar');
    return resp.success;
  } catch (err) {
    console.error('Error removing avatar', err);
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
    const resp = await api.post('/user/logout');
    if (resp?.success) {
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
    const resp = await api.post('/user/delete');
    if (resp?.success) {
      logOut();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error deleting account', err);
    return false;
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  try {
    const resp = await api.post('/user/change/password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return resp.success;
  } catch (err) {
    console.error('Error changing password', err);
    return false;
  }
}

export async function equipCosmetic(cosmeticId: string): Promise<boolean> {
  try {
    const resp = await api.post('/user/cosmetics/equip', { cosmetic_id: cosmeticId });
    return resp.success;
  } catch (err) {
    console.error('Error equipping cosmetic', err);
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

  if (Number.isNaN(expiresAtNum) || timeNow >= expiresAtNum) {
    return false;
  }

  return true;
}
