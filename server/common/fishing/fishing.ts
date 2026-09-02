import { fnv1a32, mulberry32, weightedRandom } from '../math';
import type { IFish } from '../models/fish';
import { fishingBaits } from './fishingBait';
import {
  type FishingEventInfo,
  type CurrentFishingEvent,
  type UpcomingFishingEvent,
  fishingEvents,
} from './fishingEvents';
import { fishingRods } from './fishingRods';
import { fishModifiers } from './fishModifiers';
import { fishTypes } from './fishTypes';
import {
  getTimeZoneDateUtc,
  getTimeZoneDayStartUtc,
  getTimeZoneParts,
  SYDNEY_TIME_ZONE,
} from '../timezone';

const AQUARIUM_EVENT_MODIFIER_CHANCE = 0.25;
const AQUARIUM_EVENT_ROLL_WINDOW_MS = 60 * 1000;

const FISH_MODIFIER_CAP = 3;

const IDLE_MIN_DURATION = 15; // minutes
const IDLE_MAX_DURATION = 60; // minutes
const IDLE_PROBABILITY = 0.25;

// How far ahead (in days, starting from the previous day) random-schedule
// segments are built when computing upcoming events. Date-range (holiday)
// events are computed independently of this window, so this only bounds the
// deterministic random schedule lookup - it is far longer than any holiday.
const UPCOMING_LOOKAHEAD_DAYS = 21;

interface DaySegment {
  event: FishingEventInfo | null;
  startAt: number;
  endsAt: number;
}

function clampFishModifiers(modifiers: string[] | undefined): string[] {
  if (!modifiers || modifiers.length === 0) {
    return [];
  }

  const unique = Array.from(new Set(modifiers));
  return unique.slice(0, FISH_MODIFIER_CAP);
}

export interface FishingResult {
  fish_type: string; // ID of the fish type caught
  weight: number; // Weight of the fish caught in kilograms
  modifiers?: string[]; // Array of modifier IDs that apply to this fish
  bait_used: string | null; // ID of the bait used, or null if no bait
  rod_used: string; // ID of the fishing rod used
  event_active: FishingEventInfo | null; // Active fishing event info, or null if no event
  timestamp: number; // When the fishing attempt occurred
}

/**
 * Simulates a fishing attempt and calculates the result based on the provided bait and rod, as well as any active fishing events.
 * @param baitId - ID of the bait used for fishing, or null if no bait is used
 * @param rodId - ID of the fishing rod used for fishing
 * @returns A FishingResult object containing details about the fish caught, the bait and rod used, any active event, and the timestamp of the attempt in milliseconds since the Unix epoch.
 */
export function calculateFishingResult(baitId: string | null, rodId: string): FishingResult {
  const bait = baitId ? fishingBaits.find(b => b.id === baitId) : null;
  const rod = fishingRods.find(r => r.id === rodId);

  const event = getCurrentFishingEvent();
  const eventId = event.event?.id ?? 'none';

  // Create a seed based on the current day, rod, bait, and event
  const now = new Date();
  const nowParts = getTimeZoneParts(now.getTime(), SYDNEY_TIME_ZONE);
  const timeKey = `${nowParts.year}-${nowParts.month - 1}-${nowParts.day}-${nowParts.hour}-${nowParts.second}-${now.getMilliseconds()}`;
  const seedStr = `fishing-${timeKey}-${rodId}-${baitId ?? 'no_bait'}-${eventId}`;
  const seed = fnv1a32(seedStr);
  const rng = mulberry32(seed);

  const luckyBoost = rng() * 1.25 + 0.75; // 0.75x to 2x boost for weight based on luck

  // Calculate fish type weights:
  // - Start with base weights from fishTypes
  // - Apply bait boosts (0.2-0.4x multiplier for non-boosted fish, 1.6-1.8x multiplier for boosted fish)
  const fishTypeRarityWeights: { [fishTypeId: string]: number } = {};
  for (const fishType of fishTypes) {
    let weight = fishType.rarity_weight; // Base weight

    if (bait) {
      if (bait.fish_types_boosted.includes(fishType.id)) {
        weight *= 1.6 + rng() * 0.2; // Boosted fish get 1.6-1.8x weight
      } else {
        weight *= 0.2 + rng() * 0.2; // Non-boosted fish get 0.2-0.4x weight
      }
    }

    fishTypeRarityWeights[fishType.id] = weight;
  }

  const fishType = weightedRandom(
    fishTypes,
    fishTypes.map(ft => fishTypeRarityWeights[ft.id]),
    rng
  );

  // Determine modifiers for the caught fish based on active event and random chance
  let modifier = null;
  if (rng() <= 0.5) {
    const possibleModifiers = fishModifiers.filter(mod => mod.event === event.event?.id);
    if (possibleModifiers.length > 0) {
      const chosenModifier = weightedRandom(
        possibleModifiers,
        possibleModifiers.map(m => m.rarity_weight),
        rng
      );

      if (chosenModifier) {
        modifier = chosenModifier.id;
      }
    }
  }

  // Calculate weight of the caught fish based on its type, rod multiplier, and lucky boost
  const baseWeight = rng() * (fishType.max_weight - fishType.min_weight) + fishType.min_weight;
  const rodMultiplier = rod ? rod.multiplier : 1;
  const finalWeight = baseWeight * rodMultiplier * luckyBoost;

  return {
    fish_type: fishType.id,
    weight: Number.parseFloat(finalWeight.toFixed(2)),
    modifiers: clampFishModifiers(modifier ? [modifier] : []),
    bait_used: bait ? bait.id : null,
    rod_used: rod ? rod.id : 'damaged-rod',
    event_active: event.event,
    timestamp: now.getTime(),
  };
}

/**
 * Deterministically picks the next event (or idle gap) in a day's random
 * schedule using the seeded RNG. Mirrors the original schedule logic exactly.
 */
function pickRandomEvent(
  rng: () => number,
  randomEvents: FishingEventInfo[],
  lastEventId: string | null
): FishingEventInfo | null {
  const candidates = lastEventId
    ? randomEvents.filter(event => event.id !== lastEventId)
    : randomEvents;
  const events = candidates.length > 0 ? candidates : randomEvents;

  let totalWeight = 0;
  for (const event of events) {
    const minDuration = event.timing.min_duration ?? 30;
    const maxDuration = event.timing.max_duration ?? 120;
    const avgDuration = (minDuration + maxDuration) / 2;
    totalWeight += 1 / avgDuration;
  }

  const idleWeight = (totalWeight * IDLE_PROBABILITY) / (1 - IDLE_PROBABILITY);
  const totalWithIdle = totalWeight + idleWeight;

  let target = rng() * totalWithIdle;
  if (target <= idleWeight) {
    return null;
  }

  target -= idleWeight;
  for (const event of events) {
    const minDuration = event.timing.min_duration ?? 30;
    const maxDuration = event.timing.max_duration ?? 120;
    const avgDuration = (minDuration + maxDuration) / 2;
    target -= 1 / avgDuration;
    if (target <= 0) {
      return event;
    }
  }

  return events[0];
}

/**
 * Builds the deterministic list of event/idle segments for a full Sydney day.
 * Segments do not get clamped to the day: a segment starting near the end of
 * the day keeps its full duration (which can spill into the next day), exactly
 * as the original schedule allowed.
 */
function buildDaySegments(startUtc: number, randomEvents: FishingEventInfo[]): DaySegment[] {
  const dayParts = getTimeZoneParts(startUtc, SYDNEY_TIME_ZONE);
  const key = `fishing-event-${dayParts.year}-${dayParts.month - 1}-${dayParts.day}`;
  const seed = fnv1a32(key);
  const rng = mulberry32(seed);
  const dayEnd = startUtc + 24 * 60 * 60 * 1000;

  const segments: DaySegment[] = [];
  let cursor = startUtc;
  let lastEventId: string | null = null;
  while (cursor < dayEnd) {
    const event = pickRandomEvent(rng, randomEvents, lastEventId);
    const minDuration = event?.timing.min_duration ?? IDLE_MIN_DURATION;
    const maxDuration = event?.timing.max_duration ?? IDLE_MAX_DURATION;
    const durationMinutes = minDuration + Math.floor(rng() * (maxDuration - minDuration + 1));
    const durationMs = durationMinutes * 60 * 1000;
    segments.push({ event, startAt: cursor, endsAt: cursor + durationMs });
    cursor += durationMs;
    lastEventId = event?.id ?? null;
  }

  return segments;
}

/**
 * Determines the currently active fishing event based on the current date and time. It checks for any events that are active during the current time, including both fixed date range events and randomly scheduled events that change throughout the day. For random events, it uses a deterministic algorithm to ensure that all players see the same event at the same time. The function returns the active event along with its end time.
 * @returns An object containing the currently active fishing event and its end time. The event is determined by first checking for any date range events that encompass the current date. If no such event is active, it then checks for random events that are scheduled throughout the day using a deterministic method based on the current date. The returned object includes the event information and the timestamp of when the event will end (in milliseconds since the Unix epoch).
 */
export function getCurrentFishingEvent(timestamp = Date.now()): CurrentFishingEvent {
  const now = timestamp;
  const nowParts = getTimeZoneParts(timestamp, SYDNEY_TIME_ZONE);

  // Check if there is a event that is specifically active during this time
  for (const event of fishingEvents) {
    if (event.timing.type === 'date_range') {
      const startMonth = event.timing.start_month ?? 0;
      const startDay = event.timing.start_day ?? 1;
      const endMonth = event.timing.end_month ?? 11;
      const endDay = event.timing.end_day ?? 31;

      const year = nowParts.year;
      const startDate = getTimeZoneDateUtc(SYDNEY_TIME_ZONE, year, startMonth, startDay);
      const endDate = getTimeZoneDateUtc(SYDNEY_TIME_ZONE, year, endMonth, endDay, 23, 59, 59);

      if (now >= startDate && now <= endDate) {
        return {
          event,
          endsAt: endDate,
        };
      }
    }
  }

  // Deterministic schedule for random events within the current Sydney day.
  const dayStart = getTimeZoneDayStartUtc(timestamp, SYDNEY_TIME_ZONE);

  const randomEvents = fishingEvents.filter(event => event.timing.type === 'random');
  if (randomEvents.length === 0) {
    return {
      event: null,
      endsAt: dayStart + 24 * 60 * 60 * 1000,
    };
  }

  const activeIn = (segments: DaySegment[]): CurrentFishingEvent | null => {
    for (const segment of segments) {
      if (now < segment.endsAt) {
        return {
          event: segment.event,
          endsAt: segment.endsAt,
        };
      }
    }
    return null;
  };

  const previousDayEvent = activeIn(buildDaySegments(dayStart - 24 * 60 * 60 * 1000, randomEvents));
  if (previousDayEvent) {
    return previousDayEvent;
  }

  const currentDayEvent = activeIn(buildDaySegments(dayStart, randomEvents));
  if (currentDayEvent) {
    return currentDayEvent;
  }

  return {
    event: null,
    endsAt: dayStart + 24 * 60 * 60 * 1000,
  };
}

/**
 * Computes the next `count` fishing events (idle gaps included) from the given
 * timestamp. The first entry is the currently active event if one is running.
 * Date-range (holiday) events override the random schedule for their window,
 * so their windows are merged into the timeline and shadow any overlapping
 * random segments, matching how "current event" resolution works.
 * @returns An array of upcoming events (up to `count`), each with its start and end time and the event info (or null for idle gaps).
 */
export function getUpcomingFishingEvents(timestamp: number, count: number): UpcomingFishingEvent[] {
  const now = timestamp;
  const nowParts = getTimeZoneParts(now, SYDNEY_TIME_ZONE);
  const randomEvents = fishingEvents.filter(event => event.timing.type === 'random');

  // Date-range (holiday) events, both for this year and the next (a holiday
  // that is currently active, or one arriving shortly after the year flips).
  const rangeSegments: DaySegment[] = [];
  for (const year of [nowParts.year, nowParts.year + 1]) {
    for (const event of fishingEvents) {
      if (event.timing.type !== 'date_range') continue;
      const startMonth = event.timing.start_month ?? 0;
      const startDay = event.timing.start_day ?? 1;
      const endMonth = event.timing.end_month ?? 11;
      const endDay = event.timing.end_day ?? 31;
      const startAt = getTimeZoneDateUtc(SYDNEY_TIME_ZONE, year, startMonth, startDay);
      const endsAt = getTimeZoneDateUtc(SYDNEY_TIME_ZONE, year, endMonth, endDay, 23, 59, 59);
      if (endsAt > now) {
        rangeSegments.push({ event, startAt, endsAt });
      }
    }
  }

  // Deterministic random schedule, starting from the previous Sydney day so the
  // currently active segment (which may have started yesterday) is included.
  const dayStart = getTimeZoneDayStartUtc(now, SYDNEY_TIME_ZONE);
  let dayUtc = dayStart - 24 * 60 * 60 * 1000;
  const randomSegments: DaySegment[] = [];
  for (let i = 0; i < UPCOMING_LOOKAHEAD_DAYS; i++) {
    randomSegments.push(...buildDaySegments(dayUtc, randomEvents));
    dayUtc += 24 * 60 * 60 * 1000;
  }

  // Random segments that overlap a date-range window are shadowed by it.
  const merged = [
    ...rangeSegments,
    ...randomSegments.filter(
      segment => !rangeSegments.some(range => segment.startAt < range.endsAt && segment.endsAt > range.startAt)
    ),
  ].sort((a, b) => a.startAt - b.startAt);

  const upcoming: UpcomingFishingEvent[] = [];
  let seenFirstRemaining = false;
  for (const segment of merged) {
    if (segment.endsAt <= now) continue;
    if (upcoming.length >= count) break;

    if (!seenFirstRemaining) {
      // The first segment that hasn't ended is either the current event or the
      // next upcoming one - either way it belongs at the front of the preview.
      seenFirstRemaining = true;
      upcoming.push({ event: segment.event, startAt: segment.startAt, endsAt: segment.endsAt });
      continue;
    }

    // Skip segments eclipsed by the one already captured (e.g. an event that
    // spilled past midnight vs. the following day's very first segment).
    const last = upcoming[upcoming.length - 1];
    if (segment.startAt < last.endsAt) continue;
    upcoming.push({ event: segment.event, startAt: segment.startAt, endsAt: segment.endsAt });
  }

  return upcoming;
}

/**
 * Calculates the sell value of a caught fish based on its type, weight, and any modifiers it has.
 * @param fish - The IFish object representing the caught fish, including its type, weight, and any modifiers. The fish type determines the base price, the weight scales the price, and the modifiers can further increase or decrease the value.
 * @returns The calculated sell value of the fish as a number. If the fish type is not recognized, it returns 0. Otherwise, it applies the base price from the fish type, scales it by the weight, and then applies any modifiers to determine the final value. The result is rounded to 2 decimal places.
 */
export function getFishValue(fish: IFish): number {
  const fishType = fishTypes.find(ft => ft.id === fish.type);
  if (!fishType) {
    return 0;
  }

  // Base value is determined by the fish type and weight
  const baseValue = fishType.base_price * (fish.weight / fishType.min_weight);

  let modifiedValue = baseValue;
  for (const modifier of fish.modifiers || []) {
    const mod = fishModifiers.find(m => m.id === modifier);
    if (mod) {
      modifiedValue *= mod.multiplier;
    }
  }

  return Number.parseFloat(modifiedValue.toFixed(2));
}

export function applyAquariumEventModifiers(
  aquariumFish: IFish[],
  currentEvent: CurrentFishingEvent | null,
  timestamp = Date.now()
): boolean {
  const event = currentEvent?.event;
  if (!event) {
    return false;
  }

  const eventModifiers = fishModifiers.filter(mod => mod.event === event.id);
  if (eventModifiers.length === 0) {
    return false;
  }

  const rollBucket = Math.floor(timestamp / AQUARIUM_EVENT_ROLL_WINDOW_MS);
  let didChange = false;

  for (const fish of aquariumFish) {
    const currentModifiers = clampFishModifiers(fish.modifiers);
    if (currentModifiers.length !== (fish.modifiers ?? []).length) {
      fish.modifiers = currentModifiers;
      didChange = true;
    }
    if (currentModifiers.length >= FISH_MODIFIER_CAP) {
      continue;
    }

    const caughtEventId = getCurrentFishingEvent(fish.caught_at).event?.id ?? null;
    if (caughtEventId === event.id) {
      continue;
    }

    const hasEventModifier = currentModifiers.some(modifierId => {
      const modifier = fishModifiers.find(mod => mod.id === modifierId);
      return modifier?.event === event.id;
    });

    if (hasEventModifier) {
      continue;
    }

    const seedStr = `aquarium-mod-${fish.uuid}-${event.id}-${rollBucket}`;
    const rng = mulberry32(fnv1a32(seedStr));

    if (rng() > AQUARIUM_EVENT_MODIFIER_CHANCE) {
      continue;
    }

    const chosenModifier = weightedRandom(
      eventModifiers,
      eventModifiers.map(mod => mod.rarity_weight),
      rng
    );

    if (!chosenModifier || currentModifiers.includes(chosenModifier.id)) {
      continue;
    }

    fish.modifiers = clampFishModifiers([...currentModifiers, chosenModifier.id]);
    didChange = true;
  }

  return didChange;
}

/**
 * Calculate the cost to upgrade the aquarium based on its current level.
 * @param currentLevel - The current level of the aquarium.
 * @returns The cost required to upgrade the aquarium.
 */
export function getAquariumUpgradeCost(currentLevel: number): number {
  const baseCost = 1000;
  const costMultiplier = 1.5;
  const cost = Math.floor(baseCost * Math.pow(costMultiplier, currentLevel));
  return cost;
}
