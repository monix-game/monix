import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { createPoll } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';
import { profanityFilter } from '../../constants';
import type { IPoll, IPollOption } from '../../../common/models/poll';
import { buildPollView } from './view';

export const createPollEndpoint = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('admin'))
  .post(
    '/',
    async ({ body, authUser, set }) => {
      const { question, options, starts_at, ends_at } = body;

      if (!question || !Array.isArray(options) || options.length < 2) {
        set.status = 400;
        return { error: 'Invalid poll payload' };
      }

      if (!Number.isFinite(starts_at) || !Number.isFinite(ends_at)) {
        set.status = 400;
        return { error: 'Invalid poll timing' };
      }

      if (Number(ends_at) <= Number(starts_at)) {
        set.status = 400;
        return { error: 'Poll end time must be after the start time' };
      }

      const sanitizedQuestion = profanityFilter.censorText(question.trim());
      if (sanitizedQuestion.length === 0 || sanitizedQuestion.length > 140) {
        set.status = 400;
        return { error: 'Poll question must be 1-140 characters long' };
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
        set.status = 400;
        return { error: 'Polls must have between 2 and 8 options' };
      }

      const poll: IPoll = {
        uuid: v4(),
        question: sanitizedQuestion,
        options: sanitizedOptions,
        votes: [],
        created_by: (authUser as { uuid?: string } | undefined)?.uuid || 'system',
        created_by_username: (authUser as { username?: string } | undefined)?.username || 'System',
        time_created: Date.now(),
        starts_at: Number(starts_at),
        ends_at: Number(ends_at),
      };

      await createPoll(poll);

      const view = buildPollView(poll, (authUser as { uuid?: string } | undefined)?.uuid || '', Date.now());
      return { poll: view };
    },
    {
      body: t.Object({
        question: t.Optional(t.String()),
        options: t.Optional(t.Array(t.Object({ label: t.Optional(t.String()), emoji: t.Optional(t.String()) }))),
        starts_at: t.Optional(t.Number()),
        ends_at: t.Optional(t.Number()),
      }),
    }
  );

export default createPollEndpoint;
