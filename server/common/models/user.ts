/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { DEFAULT_SETTINGS, type ISettings } from './settings';

export interface IUser {
  uuid: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'game_mod' | 'social_mod' | 'helper' | 'user';
  time_created: number;
  settings: ISettings;
  money: number;
  totp_secret?: string;
  setup_totp?: boolean;
  resources: { [key: string]: number };
}

export function userToDoc(u: IUser): IUser {
  return {
    uuid: u.uuid,
    username: u.username,
    password_hash: u.password_hash,
    role: u.role,
    time_created: u.time_created,
    settings: u.settings,
    money: u.money || 0,
    totp_secret: u.totp_secret,
    setup_totp: u.setup_totp,
    resources: u.resources || {},
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function userFromDoc(doc: any): IUser {
  return {
    uuid: doc.uuid || '',
    username: doc.username || '',
    password_hash: doc.password_hash || '',
    role: doc.role || 'user',
    time_created: doc.time_created || 0,
    settings: doc.settings || DEFAULT_SETTINGS,
    money: doc.money || 0,
    totp_secret: doc.totp_secret || undefined,
    setup_totp: doc.setup_totp || false,
    resources: doc.resources || {},
  };
}
