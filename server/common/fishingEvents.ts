export interface FishingEventInfo {
  id: string;
  name: string;
  icon: string;
  affects_offline: boolean;
  timing: FishingEventTiming;
}

export interface FishingEventTiming {
  type: 'random' | 'date_range' | 'semiannual';
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
    affects_offline: true,
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
    affects_offline: false,
    timing: {
      type: 'semiannual',
      min_duration: 360,
      max_duration: 360,
    },
  },
  {
    id: 'fallout',
    name: 'Fallout',
    icon: '☢️',
    affects_offline: true,
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
    affects_offline: true,
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
    affects_offline: false,
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
    affects_offline: false,
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
    affects_offline: true,
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
    affects_offline: true,
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
    affects_offline: true,
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
    affects_offline: false,
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
    affects_offline: true,
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
    affects_offline: true,
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
    affects_offline: true,
    timing: {
      type: 'random',
      min_duration: 60,
      max_duration: 120,
    },
  },
];
