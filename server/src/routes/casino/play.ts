import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';

type CasinoOutcome =
  | { ok: 'error'; status: number; error: string }
  | {
      ok: 'success';
      stake: number;
      payout: number;
      multiplier: number;
      roomsCleared: number;
      money: number;
    };

export const playCasino = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/play',
    async ({ body, authUser, set }) => {
      const userUuid = authUser?.uuid as string;
      const stake = Math.floor(body.stake);

      const result = await mutateUserAndSave<CasinoOutcome>(userUuid, async user => {
        await Promise.resolve();
        if (!Number.isFinite(stake) || stake < 10 || stake > 1_000_000) {
          return {
            changed: false,
            value: { ok: 'error', status: 400, error: 'Stake must be between 10 and 1,000,000.' },
          };
        }
        if (user.money < stake) {
          return {
            changed: false,
            value: { ok: 'error', status: 400, error: 'Insufficient funds.' },
          };
        }

        // Weighted payout table: expected return is 94% over many plays.
        const roll = Math.random() * 100;
        let multiplier = 0;
        let roomsCleared = 0;
        if (roll >= 62) {
          roomsCleared = 1;
          multiplier = 1.4;
        }
        if (roll >= 82) {
          roomsCleared = 2;
          multiplier = 2.2;
        }
        if (roll >= 92) {
          roomsCleared = 3;
          multiplier = 4;
        }
        if (roll >= 98) {
          roomsCleared = 5;
          multiplier = 10;
        }

        const payout = Math.floor(stake * multiplier);
        user.money = user.money - stake + payout;

        return {
          changed: true,
          value: { ok: 'success', stake, payout, multiplier, roomsCleared, money: user.money },
        };
      });

      if (!result) {
        set.status = 404;
        return { error: 'User not found.' };
      }
      if (result.ok === 'error') {
        set.status = result.status;
        return { error: result.error };
      }
      return result;
    },
    { body: t.Object({ stake: t.Number() }) }
  );

export default playCasino;
