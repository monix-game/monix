export const FRENZY_DURATION_MS = 60 * 1000; // 1 minute
export const FRENZY_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between activations
export const FRENZY_GEM_COST = 100;
export const FRENZY_MONEY_COST = 750_000;
export const FRENZY_WEIGHT_MULTIPLIER = 10;
export const FRENZY_COOLDOWN_S = 1; // 1 second fishing cooldown during frenzy

let frenzyActiveUntil = 0;
let frenzyLastActivatedAt = 0;

export interface FishingFrenzyStatus {
  active: boolean;
  endsAt: number;
  cooldownRemainingMs: number;
}

const FRENZY_EVENT = {
  id: 'fishing_frenzy',
  name: 'Fishing Frenzy',
  icon: '🌊',
  timing: { type: 'random' as const, min_duration: 1, max_duration: 1 },
};

export function getFrenzyEventInfo() {
  return FRENZY_EVENT;
}

export function isFishingFrenzyActive(now = Date.now()): boolean {
  return now < frenzyActiveUntil;
}

export function getFishingFrenzyEndAt(): number {
  return frenzyActiveUntil;
}

export function getFishingFrenzyCooldownRemaining(now = Date.now()): number {
  const remaining = frenzyLastActivatedAt + FRENZY_COOLDOWN_MS - now;
  return Math.max(0, remaining);
}

export function getFishingFrenzyStatus(now = Date.now()): FishingFrenzyStatus {
  return {
    active: isFishingFrenzyActive(now),
    endsAt: frenzyActiveUntil,
    cooldownRemainingMs: getFishingFrenzyCooldownRemaining(now),
  };
}

export function canActivateFrenzy(now = Date.now()): { ok: boolean; reason?: string } {
  if (isFishingFrenzyActive(now)) {
    return { ok: false, reason: 'Fishing frenzy is already active' };
  }

  const cooldownRemaining = getFishingFrenzyCooldownRemaining(now);
  if (cooldownRemaining > 0) {
    return {
      ok: false,
      reason: `Fishing frenzy is on cooldown. Try again in ${Math.ceil(cooldownRemaining / 1000)}s`,
    };
  }

  return { ok: true };
}

export function setFrenzyActive(now = Date.now()): void {
  frenzyActiveUntil = now + FRENZY_DURATION_MS;
  frenzyLastActivatedAt = now;
}

export function resetFrenzyCooldown(): void {
  frenzyLastActivatedAt = 0;
}
