/**
 * FNV-1a 32-bit hash function for deterministic seeding of RNG based on input strings.
 * @param str - The input string to hash.
 * @returns A 32-bit unsigned integer hash of the input string.
 */
export function fnv1a32(str: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0; // multiply by FNV prime
  }
  return h >>> 0;
}

/**
 * Mulberry32 PRNG implementation for generating deterministic random numbers based on a seed.
 * @param seed - The seed for the random number generator, typically a 32-bit unsigned integer.
 * @returns A function that, when called, returns a pseudo-random number in the range [0, 1).
 */
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Selects a random item from the provided list of items based on the corresponding weights using the provided RNG function.
 * @param items - An array of items to choose from.
 * @param weights - An array of weights corresponding to each item, where higher weights increase the likelihood of selection.
 * @param rng - A function that returns a random number in the range [0, 1), used to ensure deterministic randomness when seeded.
 * @returns A randomly selected item from the items array based on the provided weights and RNG function.
 */
export function weightedRandom<T>(items: T[], weights: number[], rng: () => number): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const randomWeight = rng() * totalWeight;

  let cumulativeWeight = 0;
  for (let i = 0; i < items.length; i++) {
    cumulativeWeight += weights[i];
    if (randomWeight < cumulativeWeight) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

/**
 * Checks if the user has enough gems to cover the cost, accounting for unlimited gems if gems is -1.
 * @param gems - The number of gems the user has, where -1 represents unlimited gems.
 * @param cost - The cost in gems that needs to be covered.
 * @returns True if the user has enough gems to cover the cost, or if they have unlimited gems; otherwise, false.
 */
export function hasGems(gems: number, cost: number): boolean {
  if (gems === -1) return true; // Unlimited gems
  return gems >= cost;
}

/**
 * Formats a number into a human-readable string with appropriate suffixes (K, M, B, etc.) and optional dollar sign.
 * @param num - The number to format.
 * @param includeDollarSign - Whether to include a dollar sign prefix in the formatted string (default is true).
 * @param canBeInfinity - Whether to allow formatting of -1 as infinity (∞) (default is false).
 * @returns A formatted string representing the number with appropriate suffixes and optional dollar sign.
 */
export function smartFormatNumber(
  num: number,
  includeDollarSign = true,
  canBeInfinity = false
): string {
  if (canBeInfinity && num === -1) return '∞';
  if (num === 0) return includeDollarSign ? '$0.00' : '0.00';

  const isNegative = num < 0;
  let absNum = Math.abs(num);

  const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Oc', 'No', 'De'];
  let unitIndex = 0;

  // scale down by 1000 until value < 1000 or we run out of units
  while (absNum >= 1000 && unitIndex < units.length - 1) {
    absNum /= 1000;
    unitIndex++;
  }

  // round to 2 decimals
  let rounded = Number.parseFloat(absNum.toFixed(2));

  // if rounding pushed us to 1000 (e.g., 999.999 -> 1000.00K), move to next unit
  if (rounded >= 1000 && unitIndex < units.length - 1) {
    rounded = Number.parseFloat((rounded / 1000).toFixed(2));
    unitIndex++;
  }

  // format value: keep two decimals for base unit (no suffix) to match previous behavior; for scaled units trim trailing .00
  let formattedValue: string;
  if (unitIndex === 0) {
    formattedValue = rounded.toFixed(2);
  } else if (unitIndex < units.length) {
    // remove trailing zeros like "1.00" -> "1"
    formattedValue = Number(rounded).toString();
  } else {
    // if we exceed our largest unit, just use scientific notation
    formattedValue = rounded.toExponential(2);
  }

  const prefix = includeDollarSign ? '$' : '';
  return (isNegative ? '-' : '') + prefix + formattedValue + (units[unitIndex] || '');
}

/**
 * Returns the ordinal suffix for a given number (e.g., "st" for 1, "nd" for 2, "rd" for 3, and "th" for others).
 * @param n - The number for which to get the ordinal suffix.
 * @returns A string representing the ordinal suffix for the given number.
 */
export function getOrdinalSuffix(n: number): string {
  const j = n % 10,
    k = n % 100;
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}

/**
 * Returns the podium level ("first", "second", or "third") based on the given rank, where 1 corresponds to "first", 2 to "second", and any other rank defaults to "third".
 * @param rank - The rank for which to determine the podium level (1 for first place, 2 for second place, etc.).
 * @returns A string representing the podium level corresponding to the given rank ("first", "second", or "third").
 */
export function getPodiumLevel(rank: number): 'first' | 'second' | 'third' {
  if (rank === 1) return 'first';
  if (rank === 2) return 'second';
  return 'third';
}

/**
 * Formats a given date into a relative time string (e.g., "5 minutes ago", "Yesterday at 3:00 PM") based on the current date and time.
 * @param date - The date to format as a relative time string.
 * @returns A string representing the relative time from the given date to the current date and time, such as "5 minutes ago", "Yesterday at 3:00 PM", etc.
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const timeFormat = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Check if same calendar day
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.floor((nowDate.getTime() - inputDate.getTime()) / (1000 * 60 * 60 * 24));

  // Today
  if (dayDiff === 0) {
    return timeFormat;
  }

  // Yesterday
  if (dayDiff === 1) {
    return `Yesterday at ${timeFormat}`;
  }

  // Days ago
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Weeks ago
  if (diffWeeks === 1) {
    return 'A week ago';
  }
  if (diffWeeks < 4) {
    return `${diffWeeks} weeks ago`;
  }

  // Months ago
  if (diffMonths === 1) {
    return 'A month ago';
  }
  if (diffMonths < 12) {
    return `${diffMonths} months ago`;
  }

  // Years ago
  if (diffYears === 1) {
    return 'A year ago';
  }
  return `${diffYears} years ago`;
}

/**
 * Converts a string to title case, replacing underscores with spaces and capitalizing the first letter of each word.
 * @param str - The input string to convert to title case.
 * @returns A new string in title case, where underscores are replaced with spaces and the first letter of each word is capitalized.
 */
export function titleCase(str: string): string {
  return str
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats a duration given in seconds into a human-readable string with appropriate time units (e.g., "1h 30m", "45s").
 * @param seconds - The duration in seconds to format into a human-readable string with time units.
 * @returns A formatted string representing the duration in appropriate time units, such as "1h 30m", "45s", etc.
 */
export function formatRemainingTime(seconds: number): string {
  const units = [
    { label: 'y', value: 60 * 60 * 24 * 365 },
    { label: 'w', value: 60 * 60 * 24 * 7 },
    { label: 'd', value: 60 * 60 * 24 },
    { label: 'h', value: 60 * 60 },
    { label: 'm', value: 60 },
    { label: 's', value: 1 },
  ];

  let remainingSeconds = seconds;
  const parts: string[] = [];

  for (const unit of units) {
    if (remainingSeconds >= unit.value) {
      const unitAmount = Math.floor(remainingSeconds / unit.value);
      parts.push(`${unitAmount}${unit.label}`);
      remainingSeconds -= unitAmount * unit.value;
    }
  }

  return parts.join(' ');
}

/**
 * Formats a duration given in milliseconds into a human-readable string in seconds with one decimal place (e.g., "1.5s", "0.5s").
 * @param milliseconds - The duration in milliseconds to format into a human-readable string in seconds.
 * @returns A formatted string representing the duration in seconds with one decimal place, such as "1.5s", "0.5s", etc.
 */
export function formatRemainingMilliseconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}
