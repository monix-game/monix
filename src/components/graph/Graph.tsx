import React from "react";
import "./Graph.css";

type Props = {
  data: number[];
  width?: number;
  height?: number;
  padding?: number;
  stroke?: string;
  fill?: string;
};

export const Graph: React.FC<Props> = ({
  data,
  width = 600,
  height = 200,
  padding = 24,
  stroke = "#23a6d5",
  fill = "rgba(35,166,213,0.12)",
}) => {
  if (!data || data.length === 0) return null;

  const len = data.length;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const x = (i: number) => padding + (innerW * i) / Math.max(1, len - 1);
  const y = (v: number) => padding + innerH - ((v - min) / range) * innerH;

  const points = data.map((v, i) => [x(i), y(v)] as const);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${x(len - 1).toFixed(2)} ${(
    padding + innerH
  ).toFixed(2)} L ${x(0).toFixed(2)} ${(
    padding + innerH
  ).toFixed(2)} Z`;

  // gridlines: 4 horizontal, vertical lines for each data column
  const hLines = 4;

  return (
    <svg
      className="monix-graph"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="monix-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* grid horizontal lines */}
      {Array.from({ length: hLines + 1 }).map((_, i) => {
        const yy = padding + (innerH * i) / hLines;
        return (
          <line
            key={`h-${i}`}
            x1={padding}
            x2={padding + innerW}
            y1={yy}
            y2={yy}
            stroke="#e6eef3"
            strokeWidth={1}
          />
        );
      })}

      {/* vertical grid lines */}
      {points.map((p, i) => (
        <line
          key={`v-${i}`}
          x1={p[0]}
          x2={p[0]}
          y1={padding}
          y2={padding + innerH}
          stroke="#f3f7f9"
          strokeWidth={1}
        />
      ))}

      {/* axes (no ticks or text) */}
      <line
        x1={padding}
        x2={padding + innerW}
        y1={padding + innerH}
        y2={padding + innerH}
        stroke="#cfdfe6"
        strokeWidth={1.5}
      />
      <line
        x1={padding}
        x2={padding}
        y1={padding}
        y2={padding + innerH}
        stroke="#cfdfe6"
        strokeWidth={1.5}
      />

      {/* area fill */}
      <path d={areaPath} fill={fill} />

      {/* line */}
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* markers */}
      {points.map((p, i) => (
        <circle key={`pt-${i}`} cx={p[0]} cy={p[1]} r={3.25} fill="#fff" stroke={stroke} strokeWidth={1.5} />
      ))}
    </svg>
  );
};
