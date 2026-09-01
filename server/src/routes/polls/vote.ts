import { Elysia, t } from 'elysia';
import { getPollByUUID, updatePoll } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import type { IPoll, IPollVote } from '../../../common/models/poll';
import { buildPollView } from './view';

export const votePoll = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/:uuid/vote',
    async ({ params, body, authUser, set }) => {
      const userUuid = (authUser as { uuid?: string } | undefined)?.uuid || '';

      const { uuid } = params as { uuid?: string };
      const { option_id } = body;

      if (!uuid || !option_id) {
        set.status = 400;
        return { error: 'Missing poll or option' };
      }

      const poll: IPoll | null = await getPollByUUID(uuid);
      if (!poll) {
        set.status = 404;
        return { error: 'Poll not found' };
      }

      const now = Date.now();
      if (now < poll.starts_at) {
        set.status = 400;
        return { error: 'Poll has not started yet' };
      }

      if (now > poll.ends_at) {
        set.status = 400;
        return { error: 'Poll has already ended' };
      }

      if (!poll.options.some(option => option.id === option_id)) {
        set.status = 400;
        return { error: 'Invalid poll option' };
      }

      if (poll.votes.some(vote => vote.user_uuid === userUuid)) {
        set.status = 400;
        return { error: 'You have already voted in this poll' };
      }

      const vote: IPollVote = {
        user_uuid: userUuid,
        option_id,
        time_voted: now,
      };

      poll.votes.push(vote);
      await updatePoll(poll);

      const view = buildPollView(poll, userUuid, now);
      return { poll: view };
    },
    {
      body: t.Object({ option_id: t.Optional(t.String()) }),
    }
  );

export default votePoll;
