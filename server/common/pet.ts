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

export function calculateEnergy(timeLastPlayed: number, createdAt: number): number {
  if (timeLastPlayed === createdAt) return calculateHappiness(createdAt, createdAt);

  const now = Date.now();
  const timeSincePlayed = now - timeLastPlayed;

  const maxEnergy = 100;
  const recoveryRatePerMinute = 5; // Energy recovers by 5 points per minute

  const energyRecovered = 50 + (timeSincePlayed / (60 * 1000)) * recoveryRatePerMinute;

  let energy = energyRecovered;
  if (energy < 0) energy = 0;
  if (energy > maxEnergy) energy = maxEnergy;

  return Math.floor(energy);
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
