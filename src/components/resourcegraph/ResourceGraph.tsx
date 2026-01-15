import React, { useEffect } from 'react';
import './ResourceGraph.css';
import { getPriceHistory } from '../../helpers/market';
import { Graph } from '../graph/Graph';
import type { ResourceInfo } from '../../../server/common/resources';
import { EmojiText } from '../EmojiText';

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
  const [data, setData] = React.useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const history = (await getPriceHistory(resource.id, 1)).slice(-10);
      setData(history.map(h => h.price));
    };
    void fetchData();

    // Update the history every second
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [resource.id]);

  return (
    <div className="graph-container">
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
          <span>Resource: <EmojiText>{resource.icon}</EmojiText> {resource.name}</span>
          <span>
            Current Price:{' '}
            <span className="mono">
              ${data.length > 0 ? data[data.length - 1].toFixed(2) : 'N/A'}
            </span>
            {' '}per {resource.unit.endsWith('s') ? resource.unit.slice(0, -1) : resource.unit}
          </span>
        </div>
      </div>
    </div>
  );
};
