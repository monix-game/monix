/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface IPollOption {
  id: string;
  label: string;
  emoji?: string;
}

export interface IPollVote {
  user_uuid: string;
  option_id: string;
  time_voted: number;
}

export interface IPoll {
  uuid: string;
  question: string;
  options: IPollOption[];
  votes: IPollVote[];
  created_by: string;
  created_by_username: string;
  time_created: number;
  starts_at: number;
  ends_at: number;
}

export function pollToDoc(poll: IPoll): IPoll {
  return {
    uuid: poll.uuid,
    question: poll.question,
    options: poll.options,
    votes: poll.votes,
    created_by: poll.created_by,
    created_by_username: poll.created_by_username,
    time_created: poll.time_created,
    starts_at: poll.starts_at,
    ends_at: poll.ends_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pollFromDoc(doc: any): IPoll {
  return {
    uuid: doc.uuid || '',
    question: doc.question || '',
    options: Array.isArray(doc.options) ? doc.options : [],
    votes: Array.isArray(doc.votes) ? doc.votes : [],
    created_by: doc.created_by || '',
    created_by_username: doc.created_by_username || 'Unknown',
    time_created: doc.time_created || 0,
    starts_at: doc.starts_at || 0,
    ends_at: doc.ends_at || 0,
  };
}
