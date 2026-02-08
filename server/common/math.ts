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
