/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface IUser {
  uuid: string;
  username: string;
  password_hash: string;
  is_admin: boolean;
  is_game_mod: boolean;
  is_social_mod: boolean;
  is_helper: boolean;
  time_created: number;
  money?: number;
  resources?: { [key: string]: number };
}

export function userToDoc(u: IUser): IUser {
  return {
    uuid: u.uuid,
    username: u.username,
    password_hash: u.password_hash,
    is_admin: u.is_admin,
    is_game_mod: u.is_game_mod,
    is_social_mod: u.is_social_mod,
    is_helper: u.is_helper,
    time_created: u.time_created,
    money: u.money || 0,
    resources: u.resources || {},
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function userFromDoc(doc: any): IUser {
  return {
    uuid: doc.uuid || '',
    username: doc.username || '',
    password_hash: doc.password_hash || '',
    is_admin: doc.is_admin || false,
    is_game_mod: doc.is_game_mod || false,
    is_social_mod: doc.is_social_mod || false,
    is_helper: doc.is_helper || false,
    time_created: doc.time_created || 0,
    money: doc.money || 0,
    resources: doc.resources || {},
  };
}
