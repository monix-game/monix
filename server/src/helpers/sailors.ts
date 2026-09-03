import type { IUser } from '../../common/models/user';
import {
  getSailorEarningsForElapsed,
} from '../../common/fishing/fishing';

/**
 * Credit a user the passive coins their hired sailors have earned since the
 * last collection. Called on every user snapshot (socket login + the periodic
 * 2s `user:me` push) so earnings accrue both while online and offline.
 *
 * On the very first call there is no prior timestamp, so we just establish a
 * baseline and earn nothing yet.
 *
 * @returns the amount of money credited, or 0 if nothing was earned/initialized.
 */
export function applySailorEarnings(user: { uuid: string } & Partial<IUser>): number {
  user.fishing ??= {
    aquarium: { capacity: 10, level: 1, fish: [] },
    bait_owned: {},
    fish_caught: {},
    rods_owned: [],
  };

  user.fishing.sailors ??= {
    levels: [],
    last_collected_at: undefined,
  };

  const sailors = user.fishing.sailors;

  if (!Array.isArray(sailors.levels) || sailors.levels.length === 0) {
    sailors.last_collected_at = Date.now();
    return 0;
  }

  const now = Date.now();
  const last = sailors.last_collected_at;
  if (typeof last !== 'number' || !Number.isFinite(last)) {
    // First collection baseline: don't reward a stale timestamp.
    sailors.last_collected_at = now;
    return 0;
  }

  const earned = getSailorEarningsForElapsed(sailors.levels, now - last);
  sailors.last_collected_at = now;
  if (earned > 0) {
    user.money = (user.money || 0) + earned;
  }
  return earned;
}