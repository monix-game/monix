export function smartFormatNumber(num: number): string {
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  let formatted = '';

  if (absNum < 100000) {
    formatted = absNum.toFixed(2);
  } else if (absNum < 1000000) {
    formatted = (absNum / 1000).toFixed(2) + 'K';
  } else if (absNum < 1000000000) {
    formatted = (absNum / 1000000).toFixed(2) + 'M';
  } else if (absNum < 1000000000000) {
    formatted = (absNum / 1000000000).toFixed(2) + 'B';
  } else if (absNum < 1000000000000000) {
    formatted = (absNum / 1000000000000).toFixed(2) + 'T';
  } else if (absNum < 1000000000000000000.00) {
    formatted = (absNum / 1000000000000000).toFixed(2) + 'Qa';
  } else if (absNum < 1000000000000000000000.00) {
    formatted = (absNum / 1000000000000000000.00).toFixed(2) + 'Qi';
  } else {
    formatted = absNum.toExponential(2);
  }

  return isNegative ? `-$${formatted}` : `$${formatted}`;
}
