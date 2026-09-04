import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { hasGems } from '../../../common/math';
import { broadcast } from '../../socket';
import {
  FRENZY_DURATION_MS,
  FRENZY_GEM_COST,
  FRENZY_MONEY_COST,
  canActivateFrenzy,
  getFrenzyStatus,
  setFrenzyActive,
} from '../../../common/fishing/fishingFrenzy';

let frenzyExpiryTimer: ReturnType<typeof setTimeout> | null = null;

function broadcastFrenzyStatus() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  broadcast('fishing:frenzy', getFrenzyStatus());
}

function scheduleFrenzyExpiry() {
  if (frenzyExpiryTimer) clearTimeout(frenzyExpiryTimer);
  frenzyExpiryTimer = setTimeout(() => {
    broadcastFrenzyStatus();
    frenzyExpiryTimer = null;
  }, FRENZY_DURATION_MS + 50);
}

export const fishingFrenzy = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/frenzy/activate',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { payment_type } = body;

      const preCheck = canActivateFrenzy();
      if (!preCheck.ok) {
        set.status = 400;
        return { error: preCheck.reason };
      }

      const result = await mutateUserAndSave<{ ok: boolean; error?: string; status?: number }>(
        user_uuid,
        // eslint-disable-next-line @typescript-eslint/require-await
        async fetchedUser => {
          if (payment_type === 'gems') {
            if (!hasGems(fetchedUser.gems, FRENZY_GEM_COST)) {
              return {
                changed: false,
                value: { ok: false, error: 'Insufficient gems', status: 400 },
              };
            }
            if (fetchedUser.gems !== -1) {
              fetchedUser.gems = (fetchedUser.gems || 0) - FRENZY_GEM_COST;
            }
          } else if (payment_type === 'money') {
            if ((fetchedUser.money || 0) < FRENZY_MONEY_COST) {
              return {
                changed: false,
                value: { ok: false, error: 'Insufficient money', status: 400 },
              };
            }
            fetchedUser.money -= FRENZY_MONEY_COST;
          } else {
            return {
              changed: false,
              value: { ok: false, error: 'Invalid payment type', status: 400 },
            };
          }

          setFrenzyActive();
          scheduleFrenzyExpiry();
          broadcastFrenzyStatus();

          return { changed: true, value: { ok: true } };
        }
      );

      if (!result) {
        set.status = 404;
        return { error: 'User not found' };
      }
      if (!result.ok) {
        set.status = result.status ?? 400;
        return { error: result.error };
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return { status: 'activated', ...getFrenzyStatus() };
    },
    {
      body: t.Object({
        payment_type: t.Union([t.Literal('gems'), t.Literal('money')]),
      }),
    }
  );

export default fishingFrenzy;
