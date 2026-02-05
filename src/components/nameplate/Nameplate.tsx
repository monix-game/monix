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
        className="nameplate-svg__svg"
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
      </svg>
    </span>
  );
};
