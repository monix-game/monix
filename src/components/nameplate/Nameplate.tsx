import React, { useLayoutEffect, useMemo, useRef, useState, useId } from 'react';
import './Nameplate.css';

type GradientStop = {
  offset: string;
  color: string;
};

const NAMEPLATE_GRADIENTS: Record<string, GradientStop[]> = {
  gold: [
    { offset: '27%', color: '#cfc09f' },
    { offset: '40%', color: '#ffecb3' },
    { offset: '78%', color: '#8d671b' },
  ],
  sakura: [
    { offset: '0%', color: '#f8b4c9' },
    { offset: '50%', color: '#fce1e7' },
    { offset: '100%', color: '#f8b4c9' },
  ],
};

interface NameplateProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  styleKey?: string | null;
}

export const Nameplate: React.FC<NameplateProps> = ({ text, styleKey, className, ...rest }) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const gradientId = useId();
  const shineId = useId();
  const maskId = useId();

  const gradientStops = useMemo(() => {
    if (!styleKey) return null;
    return NAMEPLATE_GRADIENTS[styleKey] || NAMEPLATE_GRADIENTS.gold;
  }, [styleKey]);

  useLayoutEffect(() => {
    if (!wrapperRef.current || !textRef.current || !gradientStops) return;
    const computed = globalThis.getComputedStyle(wrapperRef.current);
    const nextFontSize = Number.parseFloat(computed.fontSize || '16');
    const length = textRef.current.getComputedTextLength();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFontSize(nextFontSize || 16);
    setTextWidth(Math.ceil(length) + 2);
  }, [text, className, gradientStops]);

  if (!gradientStops) {
    return (
      <span ref={wrapperRef} className={className} {...rest}>
        {text}
      </span>
    );
  }

  const width = Math.max(textWidth, 1);
  const height = Math.max(fontSize, 1);

  return (
    <span
      ref={wrapperRef}
      className={`nameplate-svg ${className || ''}`}
      aria-label={text}
      {...rest}
    >
      <svg
        className="nameplate-svg__svg nameplate-svg__svg--shiny"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            {gradientStops.map(stop => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
          <linearGradient id={shineId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            <animate attributeName="x1" values="-1;2" dur="3s" repeatCount="indefinite" />
            <animate attributeName="x2" values="0;3" dur="3s" repeatCount="indefinite" />
          </linearGradient>
          <mask id={maskId}>
            <rect x="0" y="0" width={width} height={height} fill={`url(#${shineId})`} />
          </mask>
        </defs>
        <text
          ref={textRef}
          x={1}
          y={height * 0.8}
          className="nameplate-svg__text"
          fill={`url(#${gradientId})`}
        >
          {text}
        </text>
        <text
          x={1}
          y={height * 0.8}
          className="nameplate-svg__text nameplate-svg__text--shine"
          fill="white"
          mask={`url(#${maskId})`}
        >
          {text}
        </text>
      </svg>
    </span>
  );
};
