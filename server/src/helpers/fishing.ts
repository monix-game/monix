/**
 * Calculate the cost to upgrade the aquarium based on its current level.
 * @param currentLevel - The current level of the aquarium.
 * @returns The cost required to upgrade the aquarium.
 */
export function getAquariumUpgradeCost(currentLevel: number): number {
  // Exponential cost increase for each upgrade level (round to nearest integer)
  const baseCost = 1000;
  const costMultiplier = 1.5;
  const cost = Math.floor(baseCost * Math.pow(costMultiplier, currentLevel));
  return cost;
}
