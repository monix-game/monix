/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface IPendingPayment {
  uuid: string;
  user_uuid: string;
  product_id: string;
  time_created: number;
}

export function pendingPaymentToDoc(u: IPendingPayment): IPendingPayment {
  return {
    uuid: u.uuid,
    user_uuid: u.user_uuid,
    product_id: u.product_id,
    time_created: u.time_created,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pendingPaymentFromDoc(doc: any): IPendingPayment {
  return {
    uuid: doc.uuid || '',
    user_uuid: doc.user_uuid || '',
    product_id: doc.product_id || '',
    time_created: doc.time_created || 0,
  };
}
