export const SYDNEY_TIME_ZONE = 'Australia/Sydney';

type TimeZoneParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getTimeZoneParts(timestamp: number, timeZone: string): TimeZoneParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(new Date(timestamp));
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function getTimeZoneOffsetMs(timeZone: string, timestamp: number): number {
  const parts = getTimeZoneParts(timestamp, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - timestamp;
}

export function getTimeZoneDateUtc(
  timeZone: string,
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): number {
  const utcGuess = Date.UTC(year, monthIndex, day, hour, minute, second);
  let offset = getTimeZoneOffsetMs(timeZone, utcGuess);
  let utc = Date.UTC(year, monthIndex, day, hour, minute, second) - offset;
  const adjustedOffset = getTimeZoneOffsetMs(timeZone, utc);
  if (adjustedOffset !== offset) {
    offset = adjustedOffset;
    utc = Date.UTC(year, monthIndex, day, hour, minute, second) - offset;
  }

  return utc;
}

export function getTimeZoneDayStartUtc(timestamp: number, timeZone: string): number {
  const parts = getTimeZoneParts(timestamp, timeZone);
  return getTimeZoneDateUtc(timeZone, parts.year, parts.month - 1, parts.day);
}

export function getTimeZoneDayIndex(timestamp: number, timeZone: string): number {
  const dayStartUtc = getTimeZoneDayStartUtc(timestamp, timeZone);
  return Math.floor(dayStartUtc / 86400000);
}
