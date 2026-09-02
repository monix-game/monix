import { getResourceById } from '../resources';

export interface MarketHeadline {
  id: string;
  text: string;
  icon?: string;
  market?: number;
  effects?: Record<string, number>;
}

export interface NewsFeedItem {
  id: string;
  text: string;
  icon?: string;
  multiplier: number;
  active: boolean;
}

export interface MarketNewsFeed {
  interval: number;
  activeIndex: number;
  items: NewsFeedItem[];
}

export const HEADLINE_INTERVAL = 180;

export const MARKET_HEADLINES: MarketHeadline[] = [
  {
    id: 'markets-rally',
    text: 'Markets rally across the board as investor confidence returns',
    icon: '📈',
    market: 1.04,
  },
  {
    id: 'oil-surge',
    text: 'Oil prices surge after a major refinery outage',
    icon: '🛢️',
    effects: { oil: 1.18, diesel: 1.15, gas: 1.12, plastic: 1.1, rubber: 1.05 },
  },
  {
    id: 'fuel-crash',
    text: 'Fuel prices crash as huge new reserves are discovered',
    icon: '⛽',
    effects: { oil: 0.82, diesel: 0.8, gas: 0.85, plastic: 0.9 },
  },
  {
    id: 'gold-fever',
    text: 'Gold fever sweeps the island as a new strike is announced',
    icon: '🪙',
    effects: { gold: 1.22, silver: 1.12, diamond: 1.1, platinum: 1.08 },
  },
  {
    id: 'precious-slump',
    text: 'Precious metal prices slump on weak trading',
    icon: '📉',
    effects: { gold: 0.86, silver: 0.9, platinum: 0.93, palladium: 0.88 },
  },
  {
    id: 'tech-boom',
    text: 'Electronics boom as a new gadget FOMO grips the island',
    icon: '📱',
    effects: { smartphone: 1.16, laptop: 1.18, camera: 1.12, battery: 1.1, copper: 1.08, lithium: 1.1 },
  },
  {
    id: 'tech-glut',
    text: 'Electronics oversupply sends gadget prices tumbling',
    icon: '💻',
    effects: { smartphone: 0.84, laptop: 0.82, camera: 0.88, battery: 0.9 },
  },
  {
    id: 'bakery-bonanza',
    text: 'New bakery laws trigger a bread basket buying spree',
    icon: '🍞',
    effects: { bread: 1.16, bagel: 1.12, wheat: 1.1, barley: 1.08 },
  },
  {
    id: 'grain-shortage',
    text: 'Grain harvest disappoints after an unseasonal drought',
    icon: '🌾',
    effects: { wheat: 1.18, barley: 1.12, rice: 1.1, oats: 1.15 },
  },
  {
    id: 'beverage-crackdown',
    text: 'Licensing crackdown sends beverage prices through the roof',
    icon: '🍷',
    effects: { whiskey: 1.2, wine: 1.15, beer: 1.1, tea: 1.05 },
  },
  {
    id: 'crop-disease',
    text: 'Crop disease devastates island produce farms',
    icon: '🥔',
    effects: { tomato: 1.2, potato: 1.15, onion: 1.1, garlic: 1.12, chili: 1.18, cucumber: 1.12 },
  },
  {
    id: 'bumper-harvest',
    text: 'Bumper harvest floods the market with fresh produce',
    icon: '🥬',
    effects: { tomato: 0.85, potato: 0.88, corn: 0.9, cucumber: 0.85, lemon: 0.92 },
  },
  {
    id: 'luxury-bull-run',
    text: 'The rich are splurging on luxury goods again',
    icon: '💎',
    effects: { silk: 1.15, wool: 1.1, leather: 1.08, marble: 1.1, granite: 1.08, glass: 1.12 },
  },
  {
    id: 'mine-collapse',
    text: 'Mine collapse throttles raw material supply',
    icon: '⛏️',
    effects: { iron: 1.15, coal: 1.18, copper: 1.12, nickel: 1.1, zinc: 1.12, lead: 1.15 },
  },
  {
    id: 'new-mine',
    text: 'New mines open, flooding the market with ores',
    icon: '🪨',
    effects: { iron: 0.85, coal: 0.82, copper: 0.88, nickel: 0.9, zinc: 0.88, lead: 0.85, uranium: 0.92 },
  },
  {
    id: 'dairy-crater',
    text: 'Dairy prices crater amid a milk oversupply',
    icon: '🥛',
    effects: { milk: 0.85, cheese: 0.88, butter: 0.82, yogurt: 0.88, cream: 0.85 },
  },
  {
    id: 'chef-shortage',
    text: 'Island-wide chef shortage drives up food prices',
    icon: '🍖',
    effects: { beef: 1.15, chicken: 1.12, sausage: 1.1, fish: 1.08, lamb: 1.16, turkey: 1.12 },
  },
  {
    id: 'market-panic',
    text: 'Traders turn cautious as rumors of a recession spread',
    icon: '😱',
    market: 0.96,
  },
  {
    id: 'chocolate-craze',
    text: 'Chocolate craze triggers a run on cocoa and sugar',
    icon: '🍫',
    effects: { chocolate: 1.2, cocoa: 1.15, sugar: 1.1, milk: 1.05, cream: 1.05 },
  },
  {
    id: 'export-boom',
    text: 'Island exports hit record highs in a global trade boom',
    icon: '🚢',
    market: 1.03,
  },
];

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function getHeadlineIndex(timeSeconds: number): number {
  return Math.floor(Math.max(0, timeSeconds) / HEADLINE_INTERVAL) % MARKET_HEADLINES.length;
}

function headlineFactor(headline: MarketHeadline, resourceId: string): number {
  const specific = headline.effects?.[resourceId];
  if (specific !== undefined) return specific;
  return headline.market ?? 1;
}

const MIN_MULTIPLIER = 0.8;
const MAX_MULTIPLIER = 1.25;

export function getPriceMultiplier(resourceId: string, timeSeconds: number): number {
  const index = getHeadlineIndex(timeSeconds);
  const current = MARKET_HEADLINES[index];
  const next = MARKET_HEADLINES[(index + 1) % MARKET_HEADLINES.length];
  const t = (timeSeconds % HEADLINE_INTERVAL) / HEADLINE_INTERVAL;
  const blend = smoothstep(t);
  const a = headlineFactor(current, resourceId);
  const b = headlineFactor(next, resourceId);
  const multiplier = a + (b - a) * blend;
  return Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, multiplier));
}

function headlineNet(headline: MarketHeadline): number {
  const values = headline.effects ? Object.values(headline.effects) : [];
  const avg = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 1;
  return (headline.market ?? 1) * avg;
}

export function buildMarketNewsFeed(nowSeconds: number): MarketNewsFeed {
  const index = getHeadlineIndex(nowSeconds);
  return {
    interval: HEADLINE_INTERVAL,
    activeIndex: index,
    items: MARKET_HEADLINES.map((headline, i) => ({
      id: headline.id,
      text: headline.text,
      icon: headline.icon,
      multiplier: headlineNet(headline),
      active: i === index,
    })),
  };
}