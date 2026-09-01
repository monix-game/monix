import type { IPoll, IPollOption } from '../../../common/models/poll';

export type PollResult = {
  option_id: string;
  count: number;
};

export type PollView = {
  uuid: string;
  question: string;
  options: IPollOption[];
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
};

export const buildPollView = (poll: IPoll, userUuid: string, now: number): PollView => {
  const hasVoted = poll.votes.some(vote => vote.user_uuid === userUuid);
  const myVote = poll.votes.find(vote => vote.user_uuid === userUuid)?.option_id;

  let status: 'upcoming' | 'active' | 'ended';
  if (now < poll.starts_at) {
    status = 'upcoming';
  } else if (now <= poll.ends_at) {
    status = 'active';
  } else {
    status = 'ended';
  }
  const canSeeResults = status === 'ended' || hasVoted;

  const results: PollResult[] = poll.options.map(option => ({
    option_id: option.id,
    count: poll.votes.filter(vote => vote.option_id === option.id).length,
  }));
  const totalVotes = results.reduce((total, result) => total + result.count, 0);

  return {
    uuid: poll.uuid,
    question: poll.question,
    options: poll.options,
    created_by: poll.created_by,
    created_by_username: poll.created_by_username,
    time_created: poll.time_created,
    starts_at: poll.starts_at,
    ends_at: poll.ends_at,
    status,
    has_voted: hasVoted,
    my_vote: myVote,
    results: canSeeResults ? results : undefined,
    total_votes: canSeeResults ? totalVotes : undefined,
  };
};
