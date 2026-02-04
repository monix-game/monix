/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface IAppeal {
  uuid: string;
  user_uuid: string;
  punishment_uuid: string;
  punishment_category_id: string;
  reason: string;
  time_submitted: number;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string;
  time_reviewed?: number;
  review_reason?: string;
}

export function appealToDoc(m: IAppeal): IAppeal {
  return {
    uuid: m.uuid,
    user_uuid: m.user_uuid,
    punishment_uuid: m.punishment_uuid,
    punishment_category_id: m.punishment_category_id,
    reason: m.reason,
    time_submitted: m.time_submitted,
    status: m.status,
    reviewed_by: m.reviewed_by,
    time_reviewed: m.time_reviewed,
    review_reason: m.review_reason,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function appealFromDoc(doc: any): IAppeal {
  return {
    uuid: doc.uuid || '',
    user_uuid: doc.user_uuid || '',
    punishment_uuid: doc.punishment_uuid || '',
    punishment_category_id: doc.punishment_category_id || '',
    reason: doc.reason || '',
    time_submitted: doc.time_submitted || 0,
    status: doc.status || 'pending',
    reviewed_by: doc.reviewed_by || undefined,
    time_reviewed: doc.time_reviewed || undefined,
    review_reason: doc.review_reason || undefined,
  };
}
