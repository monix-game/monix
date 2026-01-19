export function smartFormatNumber(num: number, includeDollarSign = true): string {
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
  let rounded = parseFloat(absNum.toFixed(2));

  // if rounding pushed us to 1000 (e.g., 999.999 -> 1000.00K), move to next unit
  if (rounded >= 1000 && unitIndex < units.length - 1) {
    rounded = parseFloat((rounded / 1000).toFixed(2));
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

export function getPodiumLevel(rank: number): 'first' | 'second' | 'third' {
  if (rank === 1) return 'first';
  if (rank === 2) return 'second';
  return 'third';
}
