export interface PunishXCategory {
  id: string;
  name: string;
  levels: number[]; // in minutes, -1 for permanent
}

export function getCategoryById(id: string): PunishXCategory | null {
  const category = punishXCategories.find(cat => cat.id === id);
  return category || null;
}

export const punishXCategories: PunishXCategory[] = [
  {
    id: 'game/exploiting/general',
    name: 'Game Exploiting - General',
    levels: [
      10080, // 7 days
      40320, // 28 days
      -1, // Permanent
    ],
  },
  {
    id: 'game/exploiting/hacking',
    name: 'Game Exploiting - Hacking',
    levels: [
      -1, // Permanent
    ],
  },
  {
    id: 'game/exploiting/glitching',
    name: 'Game Exploiting - Glitching',
    levels: [
      1440, // 1 day
      10080, // 7 days
      40320, // 28 days
      -1, // Permanent
    ],
  },
  {
    id: 'game/exploiting/bug-abuse',
    name: 'Game Exploiting - Bug Abuse',
    levels: [
      10080, // 7 days
      40320, // 28 days
      -1, // Permanent
    ],
  },
  {
    id: 'game/systems/false-reporting',
    name: 'Game Systems - Report Abuse',
    levels: [
      10080, // 7 days
      40320, // 28 days
      -1, // Permanent
    ],
  },
  {
    id: 'game/systems/appeal-abuse',
    name: 'Game Systems - Appeal Abuse',
    levels: [
      10080, // 7 days
      40320, // 28 days
      -1, // Permanent
    ],
  },
  {
    id: 'social/chat/general',
    name: 'Social - Chat - General',
    levels: [
      120, // 2 hours
      720, // 12 hours
      2880, // 2 days
      10080, // 7 days
      -1, // Permanent
    ],
  },
  {
    id: 'social/chat/spam',
    name: 'Social - Chat - Spam',
    levels: [
      60, // 1 hour
      240, // 4 hours
      1440, // 1 day
      4320, // 3 days
      -1, // Permanent
    ],
  },
  {
    id: 'social/chat/discriminatory',
    name: 'Social - Chat - Discriminatory Language',
    levels: [
      1440, // 1 day
      10080, // 7 days
      -1, // Permanent
    ],
  },
  {
    id: 'social/chat/general',
    name: 'Social - Chat - Harassment',
    levels: [
      1440, // 1 day
      10080, // 7 days
      -1, // Permanent
    ],
  },
  {
    id: 'social/image/general',
    name: 'Social - Image/Avatar - General',
    levels: [
      1440, // 1 day
      10080, // 7 days
      -1, // Permanent
    ],
  },
  {
    id: 'social/image/gore',
    name: 'Social - Image/Avatar - Gore',
    levels: [
      43200, // 1 month
      -1, // Permanent
    ],
  },
  {
    id: 'social/image/nudity',
    name: 'Social - Image/Avatar - Nudity',
    levels: [
      43200, // 1 month
      -1, // Permanent
    ],
  },
  {
    id: 'misc/illegal',
    name: 'Misc - Illegal',
    levels: [
      -1, // Permanent
    ],
  },
  {
    id: 'misc/tos',
    name: 'Misc - ToS Violation',
    levels: [
      -1, // Permanent
    ],
  },
];
