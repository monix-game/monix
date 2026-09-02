export interface FishingEventInfo {
  id: string;
  name: string;
  icon: string;
  timing: FishingEventTiming;
}

export interface CurrentFishingEvent {
  event: FishingEventInfo | null;
  endsAt: number;
}

export interface UpcomingFishingEvent {
  event: FishingEventInfo | null;
  startAt: number;
  endsAt: number;
}

export interface FishingEventTiming {
  type: 'random' | 'date_range';
  start_month?: number; // 0-11
  start_day?: number; // 1-31
  end_month?: number; // 0-11
  end_day?: number; // 1-31
  min_duration?: number; // in minutes
  max_duration?: number; // in minutes
}

export const fishingEvents: FishingEventInfo[] = [
  {
    id: 'stormbreak',
    name: 'Stormbreak',
    icon: '🌩️',
    timing: {
      type: 'random',
      min_duration: 30,
      max_duration: 120,
    },
  },
  {
    id: 'stardom',
    name: 'Stardom',
    icon: '🌟',
    timing: {
      type: 'random',
      min_duration: 120,
      max_duration: 120,
    },
  },
  {
    id: 'fallout',
    name: 'Fallout',
    icon: '☢️',
    timing: {
      type: 'random',
      min_duration: 30,
      max_duration: 120,
    },
  },
  {
    id: 'slimeification',
    name: 'The Great Slimeification',
    icon: '🟢',
    timing: {
      type: 'random',
      min_duration: 30,
      max_duration: 120,
    },
  },
  {
    id: 'reflection',
    name: 'Reflection',
    icon: '🪞',
    timing: {
      type: 'random',
      min_duration: 60,
      max_duration: 240,
    },
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: '🌈',
    timing: {
      type: 'random',
      min_duration: 30,
      max_duration: 120,
    },
  },
  {
    id: 'newyear',
    name: 'A New Year Dawns',
    icon: '🎉',
    timing: {
      type: 'date_range',
      start_month: 0,
      start_day: 1,
      end_month: 0,
      end_day: 7,
    },
  },
  {
    id: 'sadness',
    name: 'The Cries of Sadness',
    icon: '😢',
    timing: {
      type: 'random',
      min_duration: 30,
      max_duration: 120,
    },
  },
  {
    id: 'happiness',
    name: 'The Era of Happiness',
    icon: '😊',
    timing: {
      type: 'random',
      min_duration: 30,
      max_duration: 120,
    },
  },
  {
    id: 'halloween',
    name: "Hallow's Eve",
    icon: '🎃',
    timing: {
      type: 'date_range',
      start_month: 9,
      start_day: 30,
      end_month: 9,
      end_day: 30,
    },
  },
  {
    id: 'souls',
    name: 'The Escape of the Souls',
    icon: '👻',
    timing: {
      type: 'random',
      min_duration: 30,
      max_duration: 120,
    },
  },
  {
    id: 'christmas',
    name: 'The Jolliest Season',
    icon: '🎄',
    timing: {
      type: 'date_range',
      start_month: 11,
      start_day: 24,
      end_month: 11,
      end_day: 26,
    },
  },
  {
    id: 'wizards',
    name: 'The Wizards Emerge',
    icon: '🧙‍♂️',
    timing: {
      type: 'random',
      min_duration: 60,
      max_duration: 120,
    },
  },
  {
    id: 'valentines',
    name: "Valentine's Day",
    icon: '❤️',
    timing: {
      type: 'date_range',
      start_month: 1,
      start_day: 14,
      end_month: 1,
      end_day: 14,
    },
  },
];
