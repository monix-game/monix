/** Short price-history windows selectable on the resource graph. */
export type GraphRangeKey = '30s' | '1m' | '5m' | '15m' | '1h' | '6h' | '12h' | '24h';

export interface GraphRange {
  key: GraphRangeKey;
  label: string;
  seconds: number;
}

export const GRAPH_RANGES: GraphRange[] = [
  { key: '30s', label: '30s', seconds: 30 },
  { key: '1m', label: '1m', seconds: 60 },
  { key: '5m', label: '5m', seconds: 300 },
  { key: '15m', label: '15m', seconds: 900 },
  { key: '1h', label: '1h', seconds: 3_600 },
  { key: '6h', label: '6h', seconds: 21_600 },
  { key: '12h', label: '12h', seconds: 43_200 },
  { key: '24h', label: '24h', seconds: 86_400 },
];

export function rangeSeconds(key: GraphRangeKey | undefined): number {
  const range = GRAPH_RANGES.find(r => r.key === key);
  return range?.seconds ?? GRAPH_RANGES.find(r => r.key === DEFAULT_GRAPH_RANGE)!.seconds;
}

export const DEFAULT_GRAPH_RANGE: GraphRangeKey = '1h';

/**
 * Cap on points the server serialises per history window. Prices are sampled
 * every 5s, so a 24h window is 17k raw points (~780KB of JSON) re-sent every
 * 5s tick; striding them down here keeps the socket payload bounded (~20KB)
 * without touching the client budget or the 5s resolution of short windows.
 */
export const MAX_SERVER_POINTS = 400;

/** Pixel budget after client-side downsampling so the SVG node count stays low. */
export const MAX_PLOT_POINTS = 180;

/**
 * Stride-sample a series down to `maxPoints`, always keeping the newest point
 * so flat/line charts still end at the live price. Returns the input unchanged
 * when it is already within the budget.
 */
export function downsample<T>(series: T[], maxPoints: number = MAX_SERVER_POINTS): T[] {
  if (series.length <= maxPoints) return series;
  const step = series.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(series[Math.min(series.length - 1, Math.floor(i * step))]);
  }
  out[out.length - 1] = series[series.length - 1];
  return out;
}