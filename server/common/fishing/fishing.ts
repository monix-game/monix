import { fnv1a32, mulberry32, weightedRandom } from '../math';
import type { IFish } from '../models/fish';
import { fishingBaits } from './fishingBait';
import { type FishingEventInfo, type CurrentFishingEvent, fishingEvents } from './fishingEvents';
import { fishingRods } from './fishingRods';
import { fishModifiers } from './fishModifiers';
import { fishTypes } from './fishTypes';

export interface FishingResult {
  fish_type: string; // ID of the fish type caught
  weight: number; // Weight of the fish caught in kilograms
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
  const timeKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${now.getSeconds()}-${now.getUTCMilliseconds()}`;
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

  // Calculate weight of the caught fish based on its type, rod multiplier, and lucky boost
  const baseWeight = rng() * (fishType.max_weight - fishType.min_weight) + fishType.min_weight;
  const rodMultiplier = rod ? rod.multiplier : 1;
  const finalWeight = baseWeight * rodMultiplier * luckyBoost;

  return {
    fish_type: fishType.id,
    weight: Number.parseFloat(finalWeight.toFixed(2)),
    bait_used: bait ? bait.id : null,
    rod_used: rod ? rod.id : 'damaged-rod',
    event_active: event.event,
    timestamp: now.getTime(),
  };
}

/**
 * Determines the currently active fishing event based on the current date and time. It checks for any events that are active during the current time, including both fixed date range events and randomly scheduled events that change throughout the day. For random events, it uses a deterministic algorithm to ensure that all players see the same event at the same time. The function returns the active event along with its end time.
 * @returns An object containing the currently active fishing event and its end time. The event is determined by first checking for any date range events that encompass the current date. If no such event is active, it then checks for random events that are scheduled throughout the day using a deterministic method based on the current date. The returned object includes the event information and the timestamp of when the event will end (in milliseconds since the Unix epoch).
 */
export function getCurrentFishingEvent(timestamp = Date.now()): CurrentFishingEvent {
  const nowDate = new Date(timestamp);
  const now = nowDate.getTime();

  // Check if there is a event that is specifically active during this time
  for (const event of fishingEvents) {
    if (event.timing.type === 'date_range') {
      const startMonth = event.timing.start_month ?? 0;
      const startDay = event.timing.start_day ?? 1;
      const endMonth = event.timing.end_month ?? 11;
      const endDay = event.timing.end_day ?? 31;

      const year = nowDate.getUTCFullYear();
      const startDate = Date.UTC(year, startMonth, startDay);
      const endDate = Date.UTC(year, endMonth, endDay, 23, 59, 59);

      if (now >= startDate && now <= endDate) {
        return {
          event,
          endsAt: endDate,
        };
      }
    }
  }

  // Deterministic schedule for random events within the current UTC day.
  const year = nowDate.getUTCFullYear();
  const month = nowDate.getUTCMonth(); // 0..11
  const day = nowDate.getUTCDate(); // 1..31
  const dayStart = Date.UTC(year, month, day);

  const randomEvents = fishingEvents.filter(event => event.timing.type === 'random');
  if (randomEvents.length === 0) {
    return {
      event: null,
      endsAt: dayStart + 24 * 60 * 60 * 1000,
    };
  }

  const eventFromDay = (startUtc: number, timestamp: number): CurrentFishingEvent | null => {
    const dayDate = new Date(startUtc);
    const key = `fishing-event-${dayDate.getUTCFullYear()}-${dayDate.getUTCMonth()}-${dayDate.getUTCDate()}`;
    const seed = fnv1a32(key);
    const rng = mulberry32(seed);
    const dayEnd = startUtc + 24 * 60 * 60 * 1000;

    const idleMinDuration = 15; // minutes
    const idleMaxDuration = 60; // minutes
    const idleProbability = 0.25;

    const pickRandomEvent = () => {
      let totalWeight = 0;
      for (const event of randomEvents) {
        const minDuration = event.timing.min_duration ?? 30;
        const maxDuration = event.timing.max_duration ?? 120;
        const avgDuration = (minDuration + maxDuration) / 2;
        totalWeight += 1 / avgDuration;
      }

      const idleWeight = (totalWeight * idleProbability) / (1 - idleProbability);
      const totalWithIdle = totalWeight + idleWeight;

      let target = rng() * totalWithIdle;
      if (target <= idleWeight) {
        return null;
      }

      target -= idleWeight;
      for (const event of randomEvents) {
        const minDuration = event.timing.min_duration ?? 30;
        const maxDuration = event.timing.max_duration ?? 120;
        const avgDuration = (minDuration + maxDuration) / 2;
        target -= 1 / avgDuration;
        if (target <= 0) {
          return event;
        }
      }

      return randomEvents[0];
    };

    let cursor = startUtc;
    while (cursor < dayEnd) {
      const event = pickRandomEvent();
      const minDuration = event?.timing.min_duration ?? idleMinDuration; // in minutes
      const maxDuration = event?.timing.max_duration ?? idleMaxDuration; // in minutes
      const durationMinutes = minDuration + Math.floor(rng() * (maxDuration - minDuration + 1));
      const durationMs = durationMinutes * 60 * 1000;
      const eventEnd = cursor + durationMs;

      if (timestamp < eventEnd) {
        return {
          event,
          endsAt: eventEnd,
        };
      }

      cursor += durationMs;
    }

    return null;
  };

  const previousDayEvent = eventFromDay(dayStart - 24 * 60 * 60 * 1000, now);
  if (previousDayEvent) {
    return previousDayEvent;
  }

  const currentDayEvent = eventFromDay(dayStart, now);
  if (currentDayEvent) {
    return currentDayEvent;
  }

  return {
    event: null,
    endsAt: dayStart + 24 * 60 * 60 * 1000,
  };
}

export function applyFishingEventModifiersToAquarium(
  fish: IFish[],
  event: FishingEventInfo | null,
  seedKey: string
): boolean {
  const maxModifiersPerFish = 3;
  if (!event || fish.length === 0) {
    return false;
  }

  const eventModifiers = fishModifiers.filter(modifier => modifier.event === event.id);
  if (eventModifiers.length === 0) {
    return false;
  }

  const modifierEventById = new Map<string, string>();
  for (const modifier of fishModifiers) {
    modifierEventById.set(modifier.id, modifier.event);
  }

  const modifierWeights = eventModifiers.map(modifier => modifier.rarity_weight);
  let changed = false;

  for (const fishEntry of fish) {
    const currentModifiers = fishEntry.modifiers ?? [];
    if (currentModifiers.length >= maxModifiersPerFish) {
      continue;
    }
    const hasEventModifier = currentModifiers.some(
      modifierId => modifierEventById.get(modifierId) === event.id
    );

    if (hasEventModifier) {
      continue;
    }

    const seed = fnv1a32(`fish-mod-${event.id}-${fishEntry.uuid}-${seedKey}`);
    const rng = mulberry32(seed);
    const selectedModifier = weightedRandom(eventModifiers, modifierWeights, rng);

    if (selectedModifier) {
      fishEntry.modifiers = [...currentModifiers, selectedModifier.id];
      changed = true;
    }
  }

  return changed;
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
