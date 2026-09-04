export const SAILOR_MAX_LEVEL = 30;
export const SAILOR_HIRE_BASE_COST = 1000;
export const SAILOR_HIRE_GROWTH = 2;
export const SAILOR_LEVELUP_BASE_COST = 500;
export const SAILOR_LEVELUP_GROWTH = 2.2;
export const SAILOR_RATE_PER_LEVEL_PER_SEC = 0.75;
export const SAILOR_OFFLINE_CAP_MS = 6 * 60 * 60 * 1000; // 6h max pending accrual
export const SAILOR_MAX_FATIGUE = 100;

/** Cost to hire a new sailor, given the current number already hired. */
export function getSailorHireCost(currentHired: number): number {
  return Math.floor(SAILOR_HIRE_BASE_COST * Math.pow(SAILOR_HIRE_GROWTH, currentHired));
}

/** Cost to level up a sailor from its current level to the next. */
export function getSailorLevelUpCost(currentLevel: number): number {
  return Math.floor(SAILOR_LEVELUP_BASE_COST * Math.pow(SAILOR_LEVELUP_GROWTH, currentLevel));
}

/** Health-check a sailor level so we clamp to valid bounds rather than trust input. */
export function clampSailorLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.min(Math.max(Math.floor(level), 1), SAILOR_MAX_LEVEL);
}

/** Passive earning rate (coins/sec) for a single sailor at the given level. */
export function getSailorRatePerSec(level: number): number {
  return SAILOR_RATE_PER_LEVEL_PER_SEC * Math.sqrt(clampSailorLevel(level));
}

/** Total passive earning rate (coins/sec) for a fleet of sailor levels. */
export function getSailorFleetRatePerSec(levels: number[]): number {
  if (!Array.isArray(levels)) return 0;
  return levels.reduce((sum, level) => sum + getSailorRatePerSec(level), 0);
}

/**
 * How many coins a fleet earns over an elapsed window (ms), capped so players
 * can't hoard infinite passive income indefinitely.
 */
export function getSailorEarningsForElapsed(levels: number[], elapsedMs: number): number {
  if (!Array.isArray(levels) || levels.length === 0) return 0;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  const cappedMs = Math.min(elapsedMs, SAILOR_OFFLINE_CAP_MS);
  const ratePerSec = getSailorFleetRatePerSec(levels);
  return Math.floor((ratePerSec * cappedMs) / 1000);
}
