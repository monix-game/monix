/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface IReport {
  uuid: string;
  reporter_uuid: string;
  message_uuid: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  time_reported: number;
}

export function reportToDoc(r: IReport): IReport {
  return {
    uuid: r.uuid,
    reporter_uuid: r.reporter_uuid,
    message_uuid: r.message_uuid,
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
    reason: doc.reason || '',
    details: doc.details || undefined,
    status: doc.status || 'pending',
    time_reported: doc.time_reported || 0,
  };
}
