export const EXPIRES_IN = 3600; // 1 hour in seconds

export interface ISession {
  token: string;
  user_uuid: string;
  time_created: number;
}

export function sessionToDoc(s: ISession): any {
  return {
    token: s.token,
    user_uuid: s.user_uuid,
    time_created: s.time_created,
  };
}

export function sessionFromDoc(doc: any): ISession {
  return {
    token: doc.token || "",
    user_uuid: doc.user_uuid || "",
    time_created: doc.time_created || 0,
  };
}

export function sessionExpiresAt(s: ISession): number {
  return s.time_created + EXPIRES_IN;
}

export function sessionIsActive(s: ISession): boolean {
  return Date.now() / 1000 < sessionExpiresAt(s);
}
