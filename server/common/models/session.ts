/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface ISession {
  token: string;
  user_uuid: string;
  time_created: number;
  expires_at: number;
}

export function sessionToDoc(s: ISession): ISession {
  return {
    token: s.token,
    user_uuid: s.user_uuid,
    time_created: s.time_created,
    expires_at: s.expires_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sessionFromDoc(doc: any): ISession {
  return {
    token: doc.token || '',
    user_uuid: doc.user_uuid || '',
    time_created: doc.time_created || 0,
    expires_at: doc.expires_at || 0,
  };
}

export function sessionIsActive(s: ISession): boolean {
  return Date.now() / 1000 < s.expires_at;
}
