export interface PunishXCategory {
  id: string;
  name: string;
  levels: {
    type: 'social_ban' | 'game_ban';
    duration: number; // in minutes, -1 for permanent
  }[];
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
      { type: 'game_ban', duration: 10080 }, // 7 days
      { type: 'game_ban', duration: 40320 }, // 28 days
      { type: 'game_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'game/exploiting/hacking',
    name: 'Game Exploiting - Hacking',
    levels: [
      { type: 'game_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'game/exploiting/glitching',
    name: 'Game Exploiting - Glitching',
    levels: [
      { type: 'game_ban', duration: 1440 }, // 1 day
      { type: 'game_ban', duration: 10080 }, // 7 days
      { type: 'game_ban', duration: 40320 }, // 28 days
      { type: 'game_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'game/exploiting/bug-abuse',
    name: 'Game Exploiting - Bug Abuse',
    levels: [
      { type: 'game_ban', duration: 10080 }, // 7 days
      { type: 'game_ban', duration: 40320 }, // 28 days
      { type: 'game_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'game/systems/false-reporting',
    name: 'Game Systems - False Reporting',
    levels: [
      { type: 'game_ban', duration: 10080 }, // 7 days
      { type: 'game_ban', duration: 40320 }, // 28 days
      { type: 'game_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'social/chat/general',
    name: 'Social - Chat - General',
    levels: [
      { type: 'social_ban', duration: 120 }, // 2 hours
      { type: 'social_ban', duration: 720 }, // 12 hours
      { type: 'social_ban', duration: 2880 }, // 2 days
      { type: 'social_ban', duration: 10080 }, // 7 days
      { type: 'social_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'social/chat/spam',
    name: 'Social - Chat - Spam',
    levels: [
      { type: 'social_ban', duration: 60 }, // 1 hour
      { type: 'social_ban', duration: 240 }, // 4 hours
      { type: 'social_ban', duration: 1440 }, // 1 day
      { type: 'social_ban', duration: 4320 }, // 3 days
      { type: 'social_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'social/chat/discriminatory',
    name: 'Social - Chat - Discriminatory Language',
    levels: [
      { type: 'social_ban', duration: 1440 }, // 1 day
      { type: 'social_ban', duration: 10080 }, // 7 days
      { type: 'social_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'social/chat/general',
    name: 'Social - Chat - Harassment',
    levels: [
      { type: 'social_ban', duration: 1440 }, // 1 day
      { type: 'social_ban', duration: 10080 }, // 7 days
      { type: 'social_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'social/image/general',
    name: 'Social - Image/Avatar - General',
    levels: [
      { type: 'game_ban', duration: 1440 }, // 1 day
      { type: 'game_ban', duration: 10080 }, // 7 days
      { type: 'game_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'social/image/gore',
    name: 'Social - Image/Avatar - Gore',
    levels: [
      { type: 'game_ban', duration: 43200 }, // 1 month
      { type: 'game_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'social/image/nudity',
    name: 'Social - Image/Avatar - Nudity',
    levels: [
      { type: 'game_ban', duration: 43200 }, // 1 month
      { type: 'game_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'misc/illegal',
    name: 'Misc - Illegal',
    levels: [
      { type: 'game_ban', duration: -1 }, // Permanent
    ],
  },
  {
    id: 'misc/tos',
    name: 'Misc - ToS Violation',
    levels: [
      { type: 'game_ban', duration: -1 }, // Permanent
    ],
  },
];
