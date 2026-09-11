/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { PunishXCategory } from '../punishx/categories';

export interface ReportContextMessage {
  message_uuid: string;
  sender_username: string;
  content: string;
  image_url?: string;
  time_sent: number;
  deleted: boolean;
  reported: boolean;
}

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
  context?: ReportContextMessage[];
  // View-only enrichment resolved when listing reports for staff; not persisted.
  reporter_username?: string;
  reported_username?: string;
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
    context: r.context,
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
    context: doc.context || undefined,
  };
}
