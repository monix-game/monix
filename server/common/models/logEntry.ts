/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type LogLevel = 'info' | 'warn' | 'error';
export type LogType =
  | 'system'
  | 'command'
  | 'payment'
  | 'feature-flag'
  | 'report'
  | 'appeal'
  | 'moderation'
  | 'other';

export interface LogEntry {
  uuid: string;
  timestamp: Date;
  level: LogLevel;
  type: LogType;
  message: string;
  data?: {
    key: string;
    value: string;
    inline?: boolean;
  }[];
  username?: string;
}

export function logEntryToDoc(entry: LogEntry) {
  return {
    uuid: entry.uuid,
    timestamp: entry.timestamp,
    level: entry.level,
    type: entry.type,
    message: entry.message,
    data: entry.data,
    username: entry.username,
  };
}

export function logEntryFromDoc(doc: any): LogEntry {
  return {
    uuid: doc.uuid,
    timestamp: new Date(doc.timestamp),
    level: doc.level,
    type: doc.type,
    message: doc.message,
    data: doc.data,
    username: doc.username,
  };
}
