/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { PunishXCategory } from '../punishx/categories';

export interface IReport {
  uuid: string;
  reporter_uuid: string;
  message_uuid: string;
  message_content: string;
  reported_uuid: string;
  reason: PunishXCategory['id'];
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  time_reported: number;
}

export function reportToDoc(r: IReport): IReport {
  return {
    uuid: r.uuid,
    reporter_uuid: r.reporter_uuid,
    message_uuid: r.message_uuid,
    message_content: r.message_content,
    reported_uuid: r.reported_uuid,
    reason: r.reason,
    details: r.details,
    status: r.status,
    time_reported: r.time_reported,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function reportFromDoc(doc: any): IReport {
  return {
    uuid: doc.uuid || '',
    reporter_uuid: doc.reporter_uuid || '',
    message_uuid: doc.message_uuid || '',
    message_content: doc.message_content || '',
    reported_uuid: doc.reported_uuid || '',
    reason: doc.reason || null,
    details: doc.details || undefined,
    status: doc.status || 'pending',
    time_reported: doc.time_reported || 0,
  };
}
