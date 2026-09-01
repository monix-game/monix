import { localStorageKey } from './constants';
import type { IUser } from '../../server/common/models/user';
import type { ISession } from '../../server/common/models/session';
import { api } from './api';
import type {
  RequestOptionsDTO,
  CreationOptionsDTO,
  RegistrationCredentialDTO,
  AuthenticationCredentialDTO,
} from './webauthn';

export interface TwoFactorStatus {
  needs_2fa: boolean;
  has_totp: boolean;
  has_passkeys: boolean;
  has_recovery_codes: boolean;
}

export interface PasskeySummary {
  id: string;
  name: string;
  created_at: number;
}

export async function userNeeds2FA(username: string, password: string): Promise<TwoFactorStatus | null> {
  try {
    const resp = await api.post<TwoFactorStatus>('/user/needs-2fa', {
      username,
      password,
    });
    if (resp?.success && resp.data) {
      return {
        needs_2fa: !!resp.data.needs_2fa,
        has_totp: !!resp.data.has_totp,
        has_passkeys: !!resp.data.has_passkeys,
        has_recovery_codes: !!resp.data.has_recovery_codes,
      };
    }
    return null;
  } catch (err) {
    console.error('Error checking if user needs 2FA', err);
    return null;
  }
}

export interface LoginSecondFactor {
  twoFACode?: string; // TOTP
  recoveryCode?: string;
  tempToken?: string; // passkey (from passkeyAuthOptions)
  passkeyCredential?: AuthenticationCredentialDTO;
}

export async function loginWithRecoveryCode(
  username: string,
  password: string,
  recoveryCode: string
): Promise<boolean> {
  return login(username, password, { recoveryCode });
}

export async function passkeyAuthOptions(
  username: string,
  password: string
): Promise<{ options: RequestOptionsDTO; tempToken: string } | null> {
  try {
    const resp = await api.post<{ options: RequestOptionsDTO; tempToken: string }>(
      '/user/passkey/options/auth',
      { username, password }
    );
    if (resp?.success && resp.data) {
      return resp.data;
    }
    return null;
  } catch (err) {
    console.error('Error getting passkey auth options', err);
    return null;
  }
}

export async function passkeyVerifyAuth(
  username: string,
  password: string,
  tempToken: string,
  credential: AuthenticationCredentialDTO
): Promise<boolean> {
  return login(username, password, { tempToken, passkeyCredential: credential });
}

export async function passkeyRegisterOptions(): Promise<CreationOptionsDTO | null> {
  try {
    const resp = await api.post<{ options: CreationOptionsDTO }>('/user/passkey/options/register');
    if (resp?.success && resp.data?.options) {
      return resp.data.options;
    }
    return null;
  } catch (err) {
    console.error('Error getting passkey register options', err);
    return null;
  }
}

export async function passkeyVerifyRegister(
  credential: RegistrationCredentialDTO,
  name: string
): Promise<{ success: boolean; recoveryCodes?: string[] }> {
  try {
    const resp = await api.post<{ message: string; recoveryCodes?: string[] }>(
      '/user/passkey/verify/register',
      { credential, name }
    );
    return { success: resp.success, recoveryCodes: resp.data?.recoveryCodes };
  } catch (err) {
    console.error('Error verifying passkey register', err);
    return { success: false };
  }
}

export async function listPasskeys(): Promise<PasskeySummary[]> {
  try {
    const resp = await api.get<{ passkeys: PasskeySummary[] }>('/user/passkey/list');
    if (resp?.success && resp.data?.passkeys) {
      return resp.data.passkeys;
    }
    return [];
  } catch (err) {
    console.error('Error listing passkeys', err);
    return [];
  }
}

export async function renamePasskey(id: string, name: string): Promise<boolean> {
  try {
    const resp = await api.post('/user/passkey/rename', { id, name });
    return resp.success;
  } catch (err) {
    console.error('Error renaming passkey', err);
    return false;
  }
}

export async function deletePasskey(id: string): Promise<boolean> {
  try {
    const resp = await api.post('/user/passkey/delete', { id });
    return resp.success;
  } catch (err) {
    console.error('Error deleting passkey', err);
    return false;
  }
}

export async function generateRecoveryCodes(): Promise<{ success: boolean; codes?: string[] }> {
  try {
    const resp = await api.post<{ codes: string[] }>('/user/recovery/generate');
    return { success: resp.success, codes: resp.data?.codes };
  } catch (err) {
    console.error('Error generating recovery codes', err);
    return { success: false };
  }
}

export async function recoveryCodeCount(): Promise<{ total: number; unused: number } | null> {
  try {
    const resp = await api.get<{ total: number; unused: number }>('/user/recovery/count');
    if (resp?.success && resp.data) {
      return resp.data;
    }
    return null;
  } catch (err) {
    console.error('Error getting recovery code count', err);
    return null;
  }
}

export async function login(
  username: string,
  password: string,
  secondFactor?: LoginSecondFactor
): Promise<boolean> {
  try {
    const resp = await api.post<{ session: ISession }>('/user/login', {
      username,
      password,
      token: secondFactor?.twoFACode,
      recoveryCode: secondFactor?.recoveryCode,
      tempToken: secondFactor?.tempToken,
      passkeyCredential: secondFactor?.passkeyCredential,
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

export async function finish2FA(
  token: string
): Promise<{ success: boolean; recoveryCodes?: string[] }> {
  try {
    const resp = await api.post<{ message: string; recoveryCodes?: string[] }>(
      '/user/finish-2fa',
      { token }
    );
    return { success: resp.success, recoveryCodes: resp.data?.recoveryCodes };
  } catch (err) {
    console.error('Error finishing 2FA setup', err);
    return { success: false };
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

export async function completeTutorial(): Promise<boolean> {
  try {
    const resp = await api.post('/user/tutorial/complete');
    return resp.success;
  } catch (err) {
    console.error('Error completing tutorial', err);
    return false;
  }
}

export async function resetTutorial(): Promise<boolean> {
  try {
    const resp = await api.post('/user/tutorial/reset');
    return resp.success;
  } catch (err) {
    console.error('Error resetting tutorial', err);
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

export async function unequipCosmetic(cosmeticType: string): Promise<boolean> {
  try {
    const resp = await api.post('/user/cosmetics/unequip', { cosmetic_type: cosmeticType });
    return resp.success;
  } catch (err) {
    console.error('Error unequipping cosmetic', err);
    return false;
  }
}

export async function buyCosmetic(cosmeticId: string): Promise<boolean> {
  try {
    const resp = await api.post('/user/cosmetics/buy', { cosmetic_id: cosmeticId });
    return resp.success;
  } catch (err) {
    console.error('Error buying cosmetic', err);
    return false;
  }
}

export async function buyUpgrade(upgradeId: string): Promise<boolean> {
  try {
    const resp = await api.post('/user/upgrades/buy', { upgrade_id: upgradeId });
    return resp.success;
  } catch (err) {
    console.error('Error buying upgrade', err);
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
