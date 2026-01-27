/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface IFish {
  uuid: string;
  user_uuid: string;
  type: string;
  weight: number;
  modifiers?: string[];
  caught_at: number;
}

export function fishToDoc(f: IFish): IFish {
  return {
    uuid: f.uuid,
    user_uuid: f.user_uuid,
    type: f.type,
    weight: f.weight,
    modifiers: f.modifiers,
    caught_at: f.caught_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fishFromDoc(doc: any): IFish {
  return {
    uuid: doc.uuid || '',
    user_uuid: doc.user_uuid || '',
    type: doc.type || '',
    weight: doc.weight || 0,
    modifiers: doc.modifiers || [],
    caught_at: doc.caught_at || 0,
  };
}
