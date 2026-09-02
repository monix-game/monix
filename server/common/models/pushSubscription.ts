/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface IPushSubscription {
  user_uuid: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  time_created: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pushSubscriptionFromDoc(doc: any): IPushSubscription {
  return {
    user_uuid: doc.user_uuid || '',
    endpoint: doc.endpoint || '',
    keys: {
      p256dh: doc.keys?.p256dh || '',
      auth: doc.keys?.auth || '',
    },
    time_created: doc.time_created || 0,
  };
}
