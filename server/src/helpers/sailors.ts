import type { IUser } from '../../common/models/user';
import {
  getSailorEarningsForElapsed,
  getSailorRatePerSec,
  SAILOR_MAX_FATIGUE,
  SAILOR_OFFLINE_CAP_MS,
} from '../../common/fishing/sailors';

/**
 * Return the passive coins available since the last manual collection.
 *
 * If there is no prior collection timestamp, no earnings are available yet.
 *
 * @returns the amount of money currently available to collect.
 */
export function getPendingSailorEarnings(
  user: { uuid: string } & Partial<IUser>,
  now = Date.now()
): number {
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
    return 0;
  }

  const last = sailors.last_collected_at;
  if (typeof last !== 'number' || !Number.isFinite(last)) {
    return 0;
  }

  return Math.min(
    (sailors.pending_coins ?? 0) + calculateSailorEarnings(user, last, now, false),
    getSailorFleetCap(sailors.levels)
  );
}

function getSailorFleetCap(levels: number[]): number {
  return getSailorEarningsForElapsed(levels, SAILOR_OFFLINE_CAP_MS);
}

function isSailorSleeping(uuid: string, sailorIndex: number, timestamp: number): boolean {
  const day = Math.floor(timestamp / (24 * 60 * 60 * 1000));
  const slot = Math.floor(timestamp / (6 * 60 * 60 * 1000));
  let hash = 2166136261;
  for (const char of `${uuid}:${sailorIndex}:${day}:${slot}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const offset = Math.abs(hash) % (6 * 60 * 60 * 1000);
  const duration = 20 * 60 * 1000 + (Math.abs(hash >>> 8) % (30 * 60 * 1000));
  return (
    timestamp % (6 * 60 * 60 * 1000) >= offset &&
    timestamp % (6 * 60 * 60 * 1000) < offset + duration
  );
}

function calculateSailorEarnings(
  user: { uuid: string } & Partial<IUser>,
  from: number,
  to: number,
  persistFatigue: boolean
): number {
  const sailors = user.fishing?.sailors;
  if (!sailors || !Array.isArray(sailors.levels) || to <= from) return 0;
  const elapsed = Math.min(to - from, SAILOR_OFFLINE_CAP_MS);
  let fatigue: number[];
  if (persistFatigue) {
    sailors.fatigue ??= [];
    fatigue = sailors.fatigue;
  } else {
    fatigue = [...(sailors.fatigue ?? [])];
  }
  let earned = 0;
  for (let index = 0; index < sailors.levels.length; index += 1) {
    const level = sailors.levels[index];
    let currentFatigue = Math.max(0, Math.min(SAILOR_MAX_FATIGUE, fatigue[index] ?? 0));
    const steps = Math.max(1, Math.ceil(elapsed / (15 * 60 * 1000)));
    const stepMs = elapsed / steps;
    for (let step = 0; step < steps; step += 1) {
      const timestamp = from + step * stepMs;
      const sleeping = isSailorSleeping(user.uuid, index, timestamp);
      if (!sleeping) {
        earned += getSailorRatePerSec(level) * (stepMs / 1000) * (1 - currentFatigue / 200);
        currentFatigue = Math.min(SAILOR_MAX_FATIGUE, currentFatigue + (stepMs / 1000 / 3600) * 8);
      } else {
        currentFatigue = Math.max(0, currentFatigue - (stepMs / 1000 / 3600) * 20);
      }
    }
    if (fatigue[index] !== undefined) fatigue[index] = currentFatigue;
  }
  return Math.floor(earned);
}

export function accrueSailorEarnings(
  user: { uuid: string } & Partial<IUser>,
  now = Date.now()
): number {
  user.fishing ??= {
    aquarium: { capacity: 10, level: 1, fish: [] },
    bait_owned: {},
    fish_caught: {},
    rods_owned: [],
  };
  user.fishing.sailors ??= { levels: [], last_collected_at: now };
  const sailors = user.fishing.sailors;
  sailors.pending_coins = getPendingSailorEarnings(user, now);
  if (typeof sailors.last_collected_at === 'number') {
    calculateSailorEarnings(user, sailors.last_collected_at, now, true);
  }
  sailors.last_collected_at = now;
  sailors.fatigue ??= sailors.levels.map(() => 0);
  return sailors.pending_coins;
}
