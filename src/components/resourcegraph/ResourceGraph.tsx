import React, { useEffect, useMemo, useState } from 'react';
import styles from './ResourceGraph.module.css';
import { Graph } from '../graph/Graph';
import type { ResourceInfo } from '../../../server/common/resources';
import { EmojiText } from '../EmojiText';
import { Spinner } from '../spinner/Spinner';
import { smartFormatNumber } from '../../../server/common/math';
import { useSocket } from '../../providers/socket';
import {
  GRAPH_RANGES,
  MAX_PLOT_POINTS,
  downsample,
  type GraphRangeKey,
} from './graphRange';

export type GraphVariant = 'line' | 'area' | 'waterfall';

const GRAPH_VARIANTS: { key: GraphVariant; label: string }[] = [
  { key: 'area', label: 'Area' },
  { key: 'line', label: 'Line' },
  { key: 'waterfall', label: 'Waterfall' },
];

const STYLE_STORAGE_KEY = 'monix-graph-style';

interface ResourceGraphProps {
  resource: ResourceInfo;
  width?: number;
  height?: number;
  padding?: number;
  stroke?: string;
  fill?: string;
}

export const ResourceGraph: React.FC<ResourceGraphProps> = ({
  resource,
  width,
  height,
  padding,
  stroke,
  fill,
}) => {
  // History is stored against the channel it was delivered for, so switching
  // resource or range can never briefly render the previous series: the stored
  // key is simply ignored until the new subscription delivers its first payload.
  const [history, setHistory] = useState<{
    key: string;
    points: Array<{ time: number; price: number }>;
  } | null>(null);
  const [currentPrice, setCurrentPrice] = useState<{ key: string; price: number } | null>(null);
  const [range, setRange] = useState<GraphRangeKey>('1h');
  const [variant, setVariant] = useState<GraphVariant>(() => {
    const stored = localStorage.getItem(STYLE_STORAGE_KEY) as GraphVariant | null;
    return stored && GRAPH_VARIANTS.some(v => v.key === stored) ? stored : 'area';
  });

  const { subscribe } = useSocket();

  const historyKey = `resources:${resource.id}:${range}`;
  const priceKey = `resources:prices:${resource.id}`;

  useEffect(() => {
    const unsubscribe = subscribe(historyKey, data => {
      setHistory({
        key: historyKey,
        points: (data as Array<{ time: number; price: number }>) || [],
      });
    });
    return unsubscribe;
  }, [historyKey, subscribe]);

  useEffect(() => {
    const unsubscribe = subscribe('resources:prices', data => {
      const prices = data as { [key: string]: number };
      const price = prices[resource.id];
      if (typeof price === 'number') setCurrentPrice({ key: priceKey, price });
    });
    return unsubscribe;
  }, [priceKey, resource.id, subscribe]);

  const doChangeVariant = (next: GraphVariant) => {
    setVariant(next);
    localStorage.setItem(STYLE_STORAGE_KEY, next);
  };

  const points = history?.key === historyKey ? history.points : null;
  const hydrated = points !== null;

  const data = useMemo(
    () =>
      points
        ? downsample(
            points.map(h => h.price),
            MAX_PLOT_POINTS
          )
        : [],
    [points]
  );

  const livePrice = currentPrice?.key === priceKey ? currentPrice.price : null;
  const shownPrice =
    livePrice !== null
      ? livePrice
      : points && points.length > 0
        ? (points.at(-1)?.price ?? 0)
        : null;

  // Percentage change from the first to the last point in the currently shown window.
  const priceChangePct = (() => {
    if (data.length < 2) return null;
    const first = data[0];
    const last = data.at(-1) ?? first;
    if (!first) return null;
    return ((last - first) / first) * 100;
  })();
  const changeClass =
    priceChangePct === null
      ? ''
      : priceChangePct > 0
        ? styles['graph-price-up']
        : priceChangePct < 0
          ? styles['graph-price-down']
          : styles['graph-price-flat'];

  return (
    <div className={styles['graph-container']}>
      {hydrated && (
        <>
          <Graph
            data={data}
            width={width}
            height={height}
            padding={padding}
            stroke={stroke}
            fill={fill}
            variant={variant}
          />
          <div className="graph-spacer"></div>
          <div className={styles['graph-under']}>
            <div className="graph-info">
              <div className={styles['graph-info-lines']}>
                <span>
                  Resource: <EmojiText>{resource.icon}</EmojiText> {resource.name}
                </span>
                <span>
                  Current Price:{' '}
                  {priceChangePct !== null && (
                    <span
                      className={`${styles['graph-price-change']} ${changeClass}`}
                      title="Price change over the displayed period"
                    >
                      {priceChangePct > 0 ? '▲' : priceChangePct < 0 ? '▼' : '—'}{' '}
                      {Math.abs(priceChangePct).toFixed(1)}%
                    </span>
                  )}{' '}
                  <span className="mono">
                    {shownPrice !== null ? smartFormatNumber(shownPrice) : 'N/A'}
                  </span>{' '}
                  per {resource.unit.endsWith('s') ? resource.unit.slice(0, -1) : resource.unit}
                </span>
              </div>
            </div>
            <div className={styles['graph-controls']}>
              <div className={styles['range-picker']} role="group" aria-label="Chart style">
                {GRAPH_VARIANTS.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    className={`${styles['range-button']} ${variant === v.key ? styles.active : ''}`}
                    onClick={() => doChangeVariant(v.key)}
                    aria-pressed={variant === v.key}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <span className={styles['control-divider']} />
              <div className={styles['range-picker']} role="group" aria-label="Chart range">
                {GRAPH_RANGES.map(r => (
                  <button
                    key={r.key}
                    type="button"
                    className={`${styles['range-button']} ${range === r.key ? styles.active : ''}`}
                    onClick={() => setRange(r.key)}
                    aria-pressed={range === r.key}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      {!hydrated && <Spinner size={32} style={{ display: 'block', margin: '40px auto' }} />}
    </div>
  );
};