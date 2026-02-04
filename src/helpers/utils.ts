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

export function titleCase(str: string): string {
  return str
    .replace('_', ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
