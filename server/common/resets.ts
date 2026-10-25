/**
 * Progression categories that staff can bulk-reset for every account.
 *
 * The ids are shared by the server route and the staff UI so the two can never
 * drift apart. Each category is applied independently: resetting money has no
 * effect on rods, bait, or anything else.
 */
export type ResetTarget =
  | 'money'
  | 'gems'
  | 'resources'
  | 'rods'
  | 'bait'
  | 'aquarium'
  | 'pets'
  | 'upgrades'
  | 'achievements'
  | 'cosmetics'
  | 'stats';

export interface ResetTargetInfo {
  id: ResetTarget;
  label: string;
  icon: string;
  description: string;
}

export const RESET_TARGETS: readonly ResetTargetInfo[] = [
  {
    id: 'money',
    label: 'Money',
    icon: '💰',
    description: "Set every player's money back to the starting $1,000.",
  },
  {
    id: 'gems',
    label: 'Gems',
    icon: '💎',
    description: "Set every player's gem balance to zero. Gems are premium currency.",
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: '📦',
    description: 'Remove all resources from every player inventory.',
  },
  {
    id: 'rods',
    label: 'Rods',
    icon: '🎣',
    description: 'Remove every owned rod and equip the starting damaged rod.',
  },
  {
    id: 'bait',
    label: 'Bait',
    icon: '🪱',
    description: 'Remove all owned bait and unequip the current bait.',
  },
  {
    id: 'aquarium',
    label: 'Aquarium fish',
    icon: '🐟',
    description: 'Empty every aquarium. Capacity and aquarium level are kept.',
  },
  {
    id: 'pets',
    label: 'Pets & satchel',
    icon: '🐾',
    description: 'Delete every owned pet, clear stray pets, and reset pet slots to 3.',
  },
  {
    id: 'upgrades',
    label: 'Upgrades',
    icon: '⚡',
    description: 'Remove all active upgrades from every player.',
  },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: '🏆',
    description: 'Clear every unlocked achievement.',
  },
  {
    id: 'cosmetics',
    label: 'Cosmetics',
    icon: '🎨',
    description: 'Remove all unlocked cosmetics and unequip nameplates and tags.',
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: '📈',
    description: 'Reset lifetime stats such as catches, sales, messages, and playtime.',
  },
];

export const RESET_TARGET_IDS: readonly ResetTarget[] = RESET_TARGETS.map(target => target.id);

/** Phrase the client must send so a reset can never be triggered by a stray request. */
export const RESET_CONFIRMATION = 'RESET';

export function isResetTarget(value: unknown): value is ResetTarget {
  return typeof value === 'string' && RESET_TARGET_IDS.includes(value as ResetTarget);
}
