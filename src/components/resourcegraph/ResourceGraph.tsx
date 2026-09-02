import React, { useEffect } from 'react';
import styles from './ResourceGraph.module.css';
import { Graph } from '../graph/Graph';
import type { ResourceInfo } from '../../../server/common/resources';
import { EmojiText } from '../EmojiText';
import { Spinner } from '../spinner/Spinner';
import { Button } from '../button/Button';
import { smartFormatNumber } from '../../../server/common/math';
import { useSocket } from '../../providers/socket';

interface ResourceGraphProps {
  resource: ResourceInfo;
  onBuySellClick: () => void;
  width?: number;
  height?: number;
  padding?: number;
  stroke?: string;
  fill?: string;
}

export const ResourceGraph: React.FC<ResourceGraphProps> = ({
  resource,
  onBuySellClick,
  width,
  height,
  padding,
  stroke,
  fill,
}) => {
  const [hydrated, setHydrated] = React.useState<boolean>(false);
  const [data, setData] = React.useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = React.useState<number | null>(null);

  const { subscribe } = useSocket();

  useEffect(() => {
    const unsubscribe = subscribe(`resources:${resource.id}`, data => {
      const history = data as Array<{ time: number; price: number }>;
      setData(history.slice(-10).map(h => h.price));
      setHydrated(true);
    });
    return unsubscribe;
  }, [resource.id, subscribe]);

  useEffect(() => {
    const unsubscribe = subscribe('resources:prices', data => {
      const prices = data as { [key: string]: number };
      const price = prices[resource.id];
      if (typeof price === 'number') setCurrentPrice(price);
    });
    return unsubscribe;
  }, [resource.id, subscribe]);

  const shownPrice =
    currentPrice !== null ? currentPrice : data.length > 0 ? data.at(-1) || 0 : null;

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
            <div className={styles.spacer}></div>
            <Button onClick={onBuySellClick} className={styles['graph-button']}>
              Buy/Sell
            </Button>
          </div>
        </>
      )}
      {!hydrated && <Spinner size={32} style={{ display: 'block', margin: '40px auto' }} />}
    </div>
  );
};
