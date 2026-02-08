import { fnv1a32, mulberry32 } from './math';
import type { IPet } from './models/pet';

export function expRequiredForLevel(level: number): number {
  // Exponential level up requirement: 100 * (level ^ 2)
  return 100 * Math.pow(level, 2);
}

export function canLevelUpPet(pet: IPet): boolean {
  // Exponential level up requirement: 100 * (level ^ 2)
  const requiredExp = expRequiredForLevel(pet.level);
  const hasEnoughExp = pet.exp >= requiredExp;
  const maxLevel = 100;
  const notMaxLevel = pet.level < maxLevel;

  // Check if the pet has been fed and played with in the last 24 hours
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const recentlyFed = now - pet.time_last_fed <= twentyFourHours;
  const recentlyPlayed = now - pet.time_last_played <= twentyFourHours;

  return hasEnoughExp && notMaxLevel && recentlyFed && recentlyPlayed;
}

export function levelUpCost(pet: IPet): number {
  // Exponential cost: 50 * (level ^ 2)
  return 50 * Math.pow(pet.level, 2);
}

export function calculateHappiness(timeLastFed: number, timeLastPlayed: number): number {
  const now = Date.now();
  const timeSinceFed = now - timeLastFed;
  const timeSincePlayed = now - timeLastPlayed;

  const maxHappiness = 100;
  const decayRatePerHour = 5; // Happiness decays by 5 points per hour

  const fedDecay = (timeSinceFed / (60 * 60 * 1000)) * decayRatePerHour;
  const playedDecay = (timeSincePlayed / (60 * 60 * 1000)) * decayRatePerHour;

  let happiness = maxHappiness - fedDecay - playedDecay;
  if (happiness < 0) happiness = 0;
  if (happiness > maxHappiness) happiness = maxHappiness;

  return Math.floor(happiness);
}

export function calculateHunger(timeLastFed: number): number {
  const now = Date.now();
  const timeSinceFed = now - timeLastFed;

  const maxHunger = 100;
  const increaseRatePerHour = 2; // Hunger increases by 2 points per hour

  const hungerIncrease = (timeSinceFed / (60 * 60 * 1000)) * increaseRatePerHour;

  let hunger = hungerIncrease;
  if (hunger < 0) hunger = 0;
  if (hunger > maxHunger) hunger = maxHunger;

  return Math.floor(hunger);
}

export function canFeedPet(pet: IPet): boolean {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return now - pet.time_last_fed >= fiveMinutes;
}

export function canPlayWithPet(pet: IPet): boolean {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return now - pet.time_last_played >= fiveMinutes;
}

export type PetSleepPeriod = {
  start: Date;
  durationMinutes: number;
  end: Date;
};

export function dailySleepPeriod(dayDate: Date, uuid: string): PetSleepPeriod {
  const year = dayDate.getUTCFullYear();
  const month = dayDate.getUTCMonth(); // 0..11
  const day = dayDate.getUTCDate(); // 1..31

  // Build a key like "2026-1-20"
  const key = `${year}-${month + 1}-${day}-${uuid}`;

  // Seed PRNG deterministically from the date key
  const seed = fnv1a32(key);
  const rng = mulberry32(seed);

  // Duration: integer minutes in [10, 45] inclusive (36 possible values)
  const durationMinutes = 10 + Math.floor(rng() * 36);

  // Start minute within the day such that the nap ends on the same calendar day
  const latestStartMinute = 24 * 60 - durationMinutes; // inclusive
  const startMinute = Math.floor(rng() * (latestStartMinute + 1));

  // Build start Date at UTC midnight then add minutes
  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  start.setUTCMinutes(start.getUTCMinutes() + startMinute);

  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return { start, durationMinutes, end };
}

export function formatSleepRemainder(sleepPeriod: PetSleepPeriod): string {
  const now = new Date();

  // Return string like "12m30s"
  const remainingMs = sleepPeriod.end.getTime() - now.getTime();
  const remainingMinutes = Math.floor(remainingMs / 60000);
  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

  let remainingStr = '';
  if (remainingMinutes > 0) {
    remainingStr += `${remainingMinutes}m`;
  }
  remainingStr += `${remainingSeconds}s`;

  return remainingStr;
}

export function formatTimeUntilSleep(uuid: string) {
  // Get today's sleep period, if already slept today, get tomorrow's
  const now = new Date();
  let sleepPeriod = dailySleepPeriod(now, uuid);
  if (now >= sleepPeriod.end) {
    // Already slept today, get tomorrow's
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    sleepPeriod = dailySleepPeriod(tomorrow, uuid);
  }

  // Return string like "3h15m"
  const timeUntilMs = sleepPeriod.start.getTime() - now.getTime();
  const hours = Math.floor(Math.max(0, timeUntilMs) / 3600000);
  const minutes = Math.floor((Math.max(0, timeUntilMs) % 3600000) / 60000);

  let result = '';
  if (hours > 0) {
    result += `${hours}h`;
  }
  result += `${minutes}m`;

  return result;
}

export function isPetAsleep(pet: IPet, now: Date = new Date()): boolean {
  const sleepPeriod = dailySleepPeriod(now, pet.uuid);
  return now >= sleepPeriod.start && now < sleepPeriod.end;
}
