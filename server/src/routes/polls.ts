import { Router } from 'express';
import { v4 } from 'uuid';
import { requireActive, requireRole } from '../middleware';
import { createPoll, getAllPolls, getPollByUUID, updatePoll } from '../db';
import { IPoll, IPollOption, IPollVote } from '../../common/models/poll';
import { profanityFilter } from '../constants';

const router = Router();

type PollResult = {
  option_id: string;
  count: number;
};

type PollView = {
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

const buildPollView = (poll: IPoll, userUuid: string, now: number): PollView => {
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

router.get('/', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as { uuid?: string } | undefined;
  const userUuid = authUser?.uuid || '';

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const polls: IPoll[] = await getAllPolls();
  const now = Date.now();
  const payload = polls.map(poll => buildPollView(poll, userUuid, now));

  res.status(200).json({ polls: payload });
});

router.post('/', requireRole('admin'), async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as { uuid?: string; username?: string } | undefined;

  const { question, options, starts_at, ends_at } = req.body as {
    question?: string;
    options?: Array<{ label?: string; emoji?: string }>;
    starts_at?: number;
    ends_at?: number;
  };

  if (!question || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Invalid poll payload' });
  }

  if (!Number.isFinite(starts_at) || !Number.isFinite(ends_at)) {
    return res.status(400).json({ error: 'Invalid poll timing' });
  }

  if (Number(ends_at) <= Number(starts_at)) {
    return res.status(400).json({ error: 'Poll end time must be after the start time' });
  }

  const sanitizedQuestion = profanityFilter.censorText(question.trim());
  if (sanitizedQuestion.length === 0 || sanitizedQuestion.length > 140) {
    return res.status(400).json({ error: 'Poll question must be 1-140 characters long' });
  }

  const sanitizedOptions: IPollOption[] = options
    .map(option => {
      const label = profanityFilter.censorText(String(option.label || '').trim());
      const emoji = String(option.emoji || '').trim();
      return {
        id: v4(),
        label,
        emoji: emoji.length > 0 ? emoji : undefined,
      };
    })
    .filter(option => option.label.length > 0 && option.label.length <= 60);

  if (sanitizedOptions.length < 2 || sanitizedOptions.length > 8) {
    return res.status(400).json({ error: 'Polls must have between 2 and 8 options' });
  }

  const poll: IPoll = {
    uuid: v4(),
    question: sanitizedQuestion,
    options: sanitizedOptions,
    votes: [],
    created_by: authUser?.uuid || 'system',
    created_by_username: authUser?.username || 'System',
    time_created: Date.now(),
    starts_at: Number(starts_at),
    ends_at: Number(ends_at),
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  await createPoll(poll);

  const view = buildPollView(poll, authUser?.uuid || '', Date.now());
  return res.status(201).json({ poll: view });
});

router.post('/:uuid/vote', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as { uuid?: string } | undefined;
  const userUuid = authUser?.uuid || '';

  const { uuid } = req.params as { uuid?: string };
  const { option_id } = req.body as { option_id?: string };

  if (!uuid || !option_id) {
    return res.status(400).json({ error: 'Missing poll or option' });
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const poll: IPoll | null = await getPollByUUID(uuid);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  const now = Date.now();
  if (now < poll.starts_at) {
    return res.status(400).json({ error: 'Poll has not started yet' });
  }

  if (now > poll.ends_at) {
    return res.status(400).json({ error: 'Poll has already ended' });
  }

  if (!poll.options.some(option => option.id === option_id)) {
    return res.status(400).json({ error: 'Invalid poll option' });
  }

  if (poll.votes.some(vote => vote.user_uuid === userUuid)) {
    return res.status(400).json({ error: 'You have already voted in this poll' });
  }

  const vote: IPollVote = {
    user_uuid: userUuid,
    option_id,
    time_voted: now,
  };

  poll.votes.push(vote);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  await updatePoll(poll);

  const view = buildPollView(poll, userUuid, now);
  return res.status(200).json({ poll: view });
});

export default router;
