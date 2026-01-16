import React, { useEffect } from 'react';
import './ResourceGraph.css';
import { getPriceHistory } from '../../helpers/market';
import { Graph } from '../graph/Graph';
import type { ResourceInfo } from '../../../server/common/resources';
import { EmojiText } from '../EmojiText';
import { Spinner } from '../spinner/Spinner';
import { Button } from '../button/Button';

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

  useEffect(() => {
    const fetchData = async () => {
      const history = (await getPriceHistory(resource.id, 1)).slice(-10);
      setData(history.map(h => h.price));
      setHydrated(true);
    };
    void fetchData();

    // Update the history every second
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [resource.id]);

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
                    ${data.length > 0 ? data[data.length - 1].toFixed(2) : 'N/A'}
                  </span>{' '}
                  per {resource.unit.endsWith('s') ? resource.unit.slice(0, -1) : resource.unit}
                </span>
              </div>
            </div>
            <div className="spacer"></div>
            <Button onClick={onBuySellClick} className="graph-button">Buy/Sell</Button>
          </div>
        </>
      )}
      {!hydrated && <Spinner size={32} style={{ display: 'block', margin: '40px auto' }} />}
    </div>
  );
};
