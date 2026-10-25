import React, { useMemo } from 'react';
import styles from './Graph.module.css';
import type { GraphVariant } from '../resourcegraph/ResourceGraph';

type GraphProps = {
  data: number[];
  width?: number;
  height?: number;
  padding?: number;
  stroke?: string;
  fill?: string;
  variant?: GraphVariant;
};

type WaterfallBar = {
  x: number;
  y: number;
  height: number;
  width: number;
  direction: 'start' | 'up' | 'down' | 'flat';
};

type Geometry = {
  min: number;
  max: number;
  linePath: string;
  areaPath: string;
  gridH: number[];
  gridV: number[];
  waterfall: WaterfallBar[];
  markers: Array<{ x: number; y: number }>;
};

function buildGeometry(data: number[], width: number, height: number, padding: number): Geometry {
  const len = data.length;
  const min = data.reduce((a, v) => Math.min(a, v), Infinity);
  const max = data.reduce((a, v) => Math.max(a, v), -Infinity);
  const range = max - min || 1;
  const avg = (min + max) / 2;

  // Smoothly blend between centered and bottom-anchored views based on data variation
  const centerThreshold = avg * 0.01; // Threshold for fully centered
  const bottomThreshold = avg * 0.45; // Threshold for fully bottom-anchored
  const blendFactor = Math.max(
    0,
    Math.min(1, (range - centerThreshold) / (bottomThreshold - centerThreshold))
  );

  const minRangePercent = avg * 0.2;
  const expandedRange = Math.max(range, minRangePercent);
  const centeredMin = avg - expandedRange / 2;
  const centeredMax = avg + expandedRange / 2;
  const bottomMin = 0;
  const bottomMax = max * 1.1;

  const scaledMin = centeredMin + (bottomMin - centeredMin) * blendFactor;
  const scaledMax = centeredMax + (bottomMax - centeredMax) * blendFactor;

  const topPad = padding;
  const bottomPad = padding;
  const innerW = width - topPad - bottomPad;
  const innerH = Math.max(1, height - topPad - bottomPad);
  const bottomY = topPad + innerH;

  const x = (i: number) => ((innerW * i) / Math.max(1, len - 1));
  const y = (v: number) => topPad + innerH - (((v - scaledMin) / (scaledMax - scaledMin)) * innerH);

  const points = data.map((v, i) => `${x(i).toFixed(2)} ${y(v).toFixed(2)}`);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p}`).join(' ');
  const areaPath = `${linePath} L ${x(len - 1).toFixed(2)} ${bottomY.toFixed(
    2
  )} L ${x(0).toFixed(2)} ${bottomY.toFixed(2)} Z`;

  // Fixed counts instead of one gridline/marker per data column: a 180-point
  // window used to emit 180 vertical lines + 178 dots on every re-render.
  const gridLines = 4;
  const gridH = Array.from({ length: gridLines + 1 }, (_, i) =>
    topPad + (innerH * i) / gridLines
  );
  const vGridCount = Math.min(len, Math.max(2, Math.floor(innerW / 90)));
  const gridV: number[] = [];
  for (let i = 0; i < vGridCount; i++) {
    gridV.push(x(Math.round((i * (len - 1)) / Math.max(1, vGridCount - 1))));
  }

  // Markers only make sense on short windows; cap the sample so dense series
  // stay cheap to render.
  const markerBudget = len <= 24 ? len : 16;
  const markers: Array<{ x: number; y: number }> = [];
  for (let i = 1; i < markerBudget; i++) {
    const idx = Math.round((i * (len - 1)) / Math.max(1, markerBudget - 1));
    if (idx === 0 || idx === len - 1) continue;
    markers.push({ x: x(idx), y: y(data[idx]) });
  }

  // Waterfall columns: the first bar shows the opening value, then each column
  // spans from the previous price to the current one. Rising moves are green,
  // falling moves are red, and a flat move gets a thin neutral marker.
  const slotWidth = innerW / len;
  const barWidth = Math.max(1, slotWidth - Math.min(2, slotWidth * 0.2));
  const columnX = (i: number) => i * slotWidth + (slotWidth - barWidth) / 2;
  const waterfall: WaterfallBar[] = data.map((v, i) => {
    if (i === 0) {
      const h = Math.max(1, bottomY - y(v));
      return { x: columnX(0), y: bottomY - h, height: h, width: barWidth, direction: 'start' };
    }

    const previous = data[i - 1];
    const top = Math.min(y(previous), y(v));
    const bottom = Math.max(y(previous), y(v));
    const h = Math.max(1, bottom - top);
    const direction = v > previous ? 'up' : v < previous ? 'down' : 'flat';
    return { x: columnX(i), y: bottom - h, height: h, width: barWidth, direction };
  });

  return { min, max, linePath, areaPath, gridH, gridV, waterfall, markers };
}

const GraphInner: React.FC<GraphProps> = ({
  data,
  width = 600,
  height = 200,
  padding = 24,
  stroke = '#4ab9e3',
  fill = 'rgba(74, 185, 227, 0.12)',
  variant = 'area',
}) => {
  const geometry = useMemo(
    () => buildGeometry(data, width, height, padding),
    [data, width, height, padding]
  );

  if (!data || data.length === 0) return null;

  const { linePath, areaPath, gridH, gridV, waterfall, markers } = geometry;
  const isBars = variant === 'waterfall';
  const drawArea = variant === 'area';

  return (
    <svg
      className={styles.graph}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ ['--blue-2' as string]: stroke, ['--graph-fill' as string]: fill }}
    >
      <defs>
        <linearGradient id="graph-grad" x1="0" x2="0" y1="0" y2="1">
          <stop className={styles['graph-grad-stop0']} offset="0%" />
          <stop className={styles['graph-grad-stop1']} offset="100%" />
        </linearGradient>
      </defs>

      {/* grid horizontal lines */}
      {gridH.map((yy, i) => (
        <line
          // eslint-disable-next-line react-x/no-array-index-key
          key={`h-${i}`}
          x1={0}
          x2={width}
          y1={yy}
          y2={yy}
          className={styles['graph-grid-h']}
        />
      ))}

      {/* vertical grid lines */}
      {gridV.map((xx, i) => (
        <line
          // eslint-disable-next-line react-x/no-array-index-key
          key={`v-${i}`}
          x1={xx}
          x2={xx}
          y1={padding}
          y2={height - padding}
          className={styles['graph-grid-v']}
        />
      ))}

      {/* axes */}
      <line x1={0} x2={width} y1={height - padding} y2={height - padding} className={styles['graph-axis']} />
      <line x1={0} x2={0} y1={padding} y2={height - padding} className={styles['graph-axis']} />

      {isBars ? (
        waterfall.map((b, i) => (
          <rect
            // eslint-disable-next-line react-x/no-array-index-key
            key={`b-${i}`}
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            className={`${styles['graph-bar']} ${styles[`graph-bar-${b.direction}`]}`}
          />
        ))
      ) : (
        <>
          {drawArea && <path d={areaPath} className={styles['graph-area']} />}
          <path d={linePath} className={styles['graph-line']} />
        </>
      )}

      {/* markers */}
      {!isBars &&
        markers.map(m => (
          <circle
            key={`pt-${m.x.toFixed(2)}-${m.y.toFixed(2)}`}
            cx={m.x}
            cy={m.y}
            r={3.25}
            className={styles['graph-point']}
          />
        ))}
    </svg>
  );
};

/** Only re-render when the series (or explicit size/style) actually changed. */
export const Graph = React.memo(GraphInner);