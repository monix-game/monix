export interface IUser {
  uuid: string;
  username: string;
  password_hash: string;
  is_admin: boolean;
  time_created: number;
}

export function userToDoc(u: IUser): any {
  return {
    uuid: u.uuid,
    username: u.username,
    password_hash: u.password_hash,
    is_admin: u.is_admin,
    time_created: u.time_created,
  };
}

export function userFromDoc(doc: any): IUser {
  return {
    uuid: doc.uuid || "",
    username: doc.username || "",
    password_hash: doc.password_hash || "",
    is_admin: doc.is_admin || false,
    time_created: doc.time_created || 0,
  };
}
