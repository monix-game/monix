import { api } from './api';

export interface PollOption {
  id: string;
  label: string;
  emoji?: string;
}

export interface PollResult {
  option_id: string;
  count: number;
}

export interface PollView {
  uuid: string;
  question: string;
  options: PollOption[];
  created_by: string;
  created_by_username: string;
  time_created: number;
  starts_at: number;
  ends_at: number;
  status: 'upcoming' | 'active' | 'ended';
  has_voted: boolean;
  my_vote?: string;
  results?: PollResult[];
  total_votes?: number;
}

export async function fetchPolls(): Promise<PollView[] | null> {
  try {
    const resp = await api.get<{ polls: PollView[] }>('/polls');
    if (resp?.success) {
      return resp.data?.polls || [];
    }
    return null;
  } catch (err) {
    console.error('Error fetching polls', err);
    return null;
  }
}

export async function voteInPoll(poll_uuid: string, option_id: string): Promise<PollView | null> {
  try {
    const resp = await api.post<{ poll: PollView }>(`/polls/${poll_uuid}/vote`, { option_id });
    if (resp?.success) {
      return resp.data?.poll || null;
    }
    return null;
  } catch (err) {
    console.error('Error voting in poll', err);
    return null;
  }
}

export async function createPoll(payload: {
  question: string;
  options: Array<{ label: string; emoji?: string }>;
  starts_at: number;
  ends_at: number;
}): Promise<PollView | null> {
  try {
    const resp = await api.post<{ poll: PollView }>('/polls', payload);
    if (resp?.success) {
      return resp.data?.poll || null;
    }
    return null;
  } catch (err) {
    console.error('Error creating poll', err);
    return null;
  }
}
