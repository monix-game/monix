import React from 'react';
import './Graph.css';

type GraphProps = {
  data: number[];
  width?: number;
  height?: number;
  padding?: number;
  stroke?: string;
  fill?: string;
};

export const Graph: React.FC<GraphProps> = ({
  data,
  width = 600,
  height = 200,
  padding = 24,
  stroke = '#4ab9e3',
  fill = 'rgba(74, 185, 227, 0.12)',
}) => {
  if (!data || data.length === 0) return null;

  const len = data.length;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const avg = (min + max) / 2;
  let range = max - min || 1;

  // Ensure a minimum zoom level to center small fluctuations
  // Keep at least ±10% of the average as the visible range
  const minRangePercent = avg * 0.2; // ±10% of average
  if (range < minRangePercent) {
    range = minRangePercent;
  }

  // Center the range around the average
  const scaledMin = avg - range / 2;
  const scaledMax = avg + range / 2;

  // remove left and right
  const leftPad = 0;
  const rightPad = 0;
  const topPad = padding;
  const bottomPad = padding;

  const innerW = width - leftPad - rightPad;
  const innerH = height - topPad - bottomPad;

  const x = (i: number) => leftPad + (innerW * i) / Math.max(1, len - 1);
  const y = (v: number) => topPad + innerH - ((v - scaledMin) / (scaledMax - scaledMin)) * innerH;

  const points = data.map((v, i) => [x(i), y(v)] as const);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(' ');

  const areaPath = `${linePath} L ${x(len - 1).toFixed(2)} ${(topPad + innerH).toFixed(
    2
  )} L ${x(0).toFixed(2)} ${(topPad + innerH).toFixed(2)} Z`;

  // gridlines: 4 horizontal, vertical lines for each data column
  const hLines = 4;

  return (
    <svg
      className="graph"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ ['--blue-2' as string]: stroke, ['--graph-fill' as string]: fill }}
    >
      <defs>
        <linearGradient id="graph-grad" x1="0" x2="0" y1="0" y2="1">
          <stop className="graph-grad-stop0" offset="0%" />
          <stop className="graph-grad-stop1" offset="100%" />
        </linearGradient>
      </defs>

      {/* grid horizontal lines */}
      {Array.from({ length: hLines + 1 }).map((_, i) => {
        const yy = topPad + (innerH * i) / hLines;
        return (
          <line
            // eslint-disable-next-line react-x/no-array-index-key
            key={`h-${i}`}
            x1={leftPad}
            x2={leftPad + innerW}
            y1={yy}
            y2={yy}
            className="graph-grid-h"
          />
        );
      })}

      {/* vertical grid lines */}
      {points.map((p, i) => (
        <line
          // eslint-disable-next-line react-x/no-array-index-key
          key={`v-${i}`}
          x1={p[0]}
          x2={p[0]}
          y1={topPad}
          y2={topPad + innerH}
          className="graph-grid-v"
        />
      ))}

      {/* axes (no ticks or text) */}
      <line
        x1={leftPad}
        x2={leftPad + innerW}
        y1={topPad + innerH}
        y2={topPad + innerH}
        className="graph-axis"
      />
      <line x1={leftPad} x2={leftPad} y1={topPad} y2={topPad + innerH} className="graph-axis" />

      {/* area fill */}
      <path d={areaPath} className="graph-area" />

      {/* line */}
      <path d={linePath} className="graph-line" />

      {/* markers */}
      {points.map((p, i) => {
        if (i === 0 || i === points.length - 1) return null;
        // eslint-disable-next-line react-x/no-array-index-key
        return <circle key={`pt-${i}`} cx={p[0]} cy={p[1]} r={3.25} className="graph-point" />;
      })}
    </svg>
  );
};
