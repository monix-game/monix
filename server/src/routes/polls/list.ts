import { Elysia } from 'elysia';
import { getAllPolls } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { buildPollView } from './view';

export const listPolls = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/', async ({ authUser }) => {
    const userUuid = (authUser as { uuid?: string } | undefined)?.uuid || '';

    const polls = await getAllPolls();
    const now = Date.now();
    const payload = polls.map(poll => buildPollView(poll, userUuid, now));

    return { polls: payload };
  });

export default listPolls;
