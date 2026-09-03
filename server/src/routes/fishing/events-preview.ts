import { Elysia } from 'elysia';
import { getUserByUUID, mutateUserAndSave } from '../../db';
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
    const fetchedUser = await getUserByUUID(authUser?.uuid as string);

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
    const user_uuid = authUser?.uuid as string;

    type UnlockOutcome =
      | { ok: 'error'; status: number; error: string; gems?: number }
      | { ok: 'success'; unlocked: true; events: UpcomingFishingEvent[]; gems?: number };

    const result = await mutateUserAndSave<UnlockOutcome>(
      user_uuid,
      async fetchedUser => {
        if (fetchedUser.fishing?.event_preview_unlocked) {
          return {
            changed: false,
            value: { ok: 'success' as const, unlocked: true, events: buildPreview() },
          };
        }

        if (!hasGems(fetchedUser.gems, EVENT_PREVIEW_COST)) {
          return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient gems to unlock the event preview' } };
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

        return {
          changed: true,
          value: {
            ok: 'success' as const,
            unlocked: true,
            events: buildPreview(),
            gems: fetchedUser.gems,
          },
        };
      }
    );

    if (!result) {
      set.status = 404;
      return { error: 'User not found' };
    }
    if (result.ok === 'error') {
      set.status = result.status;
      return { error: result.error };
    }
    return result;
  });

export default eventsPreview;