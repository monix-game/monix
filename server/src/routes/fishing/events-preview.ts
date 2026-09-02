import { Elysia } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { hasGems } from '../../../common/math';
import { getUpcomingFishingEvents } from '../../../common/fishing/fishing';
import type { UpcomingFishingEvent } from '../../../common/fishing/fishingEvents';

const EVENT_PREVIEW_COST = 10;
const EVENT_PREVIEW_COUNT = 5;

const buildPreview = (): UpcomingFishingEvent[] => getUpcomingFishingEvents(Date.now(), EVENT_PREVIEW_COUNT);

export const eventsPreview = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/events-preview', async ({ authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const unlocked = Boolean(fetchedUser.fishing?.event_preview_unlocked);
    return {
      unlocked,
      events: unlocked ? buildPreview() : null,
    };
  })
  .post('/events-preview/unlock', async ({ authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    if (fetchedUser.fishing?.event_preview_unlocked) {
      return {
        unlocked: true,
        events: buildPreview(),
      };
    }

    if (!hasGems(fetchedUser.gems, EVENT_PREVIEW_COST)) {
      set.status = 400;
      return { error: 'Insufficient gems to unlock the event preview' };
    }

    if (fetchedUser.gems !== -1) {
      fetchedUser.gems = (fetchedUser.gems || 0) - EVENT_PREVIEW_COST;
    }
    fetchedUser.fishing ??= {
      equipped_rod: 'damaged-rod',
      rods_owned: ['damaged-rod'],
      aquarium: { capacity: 10, level: 1, fish: [] },
    };
    fetchedUser.fishing.event_preview_unlocked = true;
    await updateUser(fetchedUser);

    return {
      unlocked: true,
      events: buildPreview(),
      gems: fetchedUser.gems,
    };
  });

export default eventsPreview;