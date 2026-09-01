import React, { useEffect } from 'react';
import './ResourceGraph.css';
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

  return (
    <div className="graph-container">
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
          <div className="graph-under">
            <div className="graph-info">
              <div className="graph-info-lines">
                <span>
                  Resource: <EmojiText>{resource.icon}</EmojiText> {resource.name}
                </span>
                <span>
                  Current Price:{' '}
                  <span className="mono">
                    {shownPrice !== null ? smartFormatNumber(shownPrice) : 'N/A'}
                  </span>{' '}
                  per {resource.unit.endsWith('s') ? resource.unit.slice(0, -1) : resource.unit}
                </span>
              </div>
            </div>
            <div className="spacer"></div>
            <Button onClick={onBuySellClick} className="graph-button">
              Buy/Sell
            </Button>
          </div>
        </>
      )}
      {!hydrated && <Spinner size={32} style={{ display: 'block', margin: '40px auto' }} />}
    </div>
  );
};
