import React, { useLayoutEffect, useMemo, useRef, useState, useId } from 'react';
import './Nameplate.css';

type GradientStop = {
  offset: string;
  color: string;
};

const NAMEPLATE_GRADIENTS: Record<string, { light: GradientStop[]; dark: GradientStop[] }> = {
  gold: {
    light: [
      { offset: '27%', color: '#8d671b' },
      { offset: '40%', color: '#c4a747' },
      { offset: '78%', color: '#4a3d0f' },
    ],
    dark: [
      { offset: '27%', color: '#cfc09f' },
      { offset: '40%', color: '#ffecb3' },
      { offset: '78%', color: '#8d671b' },
    ],
  },
  sakura: {
    light: [
      { offset: '0%', color: '#c4567b' },
      { offset: '50%', color: '#e8a8c9' },
      { offset: '100%', color: '#9d3456' },
    ],
    dark: [
      { offset: '0%', color: '#f8b4c9' },
      { offset: '50%', color: '#fce1e7' },
      { offset: '100%', color: '#f8b4c9' },
    ],
  },
  ember: {
    light: [
      { offset: '0%', color: '#b85225' },
      { offset: '45%', color: '#d97e50' },
      { offset: '100%', color: '#6b2f0f' },
    ],
    dark: [
      { offset: '0%', color: '#f29f58' },
      { offset: '45%', color: '#fbe0c3' },
      { offset: '100%', color: '#b63d1a' },
    ],
  },
  glacier: {
    light: [
      { offset: '0%', color: '#2d7fa3' },
      { offset: '50%', color: '#5ca8c9' },
      { offset: '100%', color: '#1a4d73' },
    ],
    dark: [
      { offset: '0%', color: '#8ee3ff' },
      { offset: '50%', color: '#e8f8ff' },
      { offset: '100%', color: '#4aa3c6' },
    ],
  },
  verdant: {
    light: [
      { offset: '0%', color: '#3d8e51' },
      { offset: '50%', color: '#69b385' },
      { offset: '100%', color: '#1f5a32' },
    ],
    dark: [
      { offset: '0%', color: '#7bd389' },
      { offset: '50%', color: '#e3f9e5' },
      { offset: '100%', color: '#2f8f4e' },
    ],
  },
  nebula: {
    light: [
      { offset: '0%', color: '#6b4a99' },
      { offset: '50%', color: '#9b7bc9' },
      { offset: '100%', color: '#3d2957' },
    ],
    dark: [
      { offset: '0%', color: '#a66bff' },
      { offset: '50%', color: '#f2ddff' },
      { offset: '100%', color: '#4b4fff' },
    ],
  },
  citrine: {
    light: [
      { offset: '0%', color: '#b8941f' },
      { offset: '45%', color: '#dab94d' },
      { offset: '100%', color: '#7a6415' },
    ],
    dark: [
      { offset: '0%', color: '#f5c26b' },
      { offset: '45%', color: '#fff1cc' },
      { offset: '100%', color: '#d38b2f' },
    ],
  },
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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const gradientId = useId();
  const shineId = useId();
  const maskId = useId();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const theme = root.dataset.theme as 'light' | 'dark' | undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDarkMode(theme !== 'light');
  }, []);

  const gradientStops = useMemo(() => {
    if (!styleKey) return null;
    const gradients = NAMEPLATE_GRADIENTS[styleKey];
    if (!gradients) return NAMEPLATE_GRADIENTS.gold[isDarkMode ? 'dark' : 'light'];
    return gradients[isDarkMode ? 'dark' : 'light'];
  }, [styleKey, isDarkMode]);

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
        {styleKey && (
          <text
            x={1}
            y={height * 0.8}
            className="nameplate-svg__text nameplate-svg__text--shine"
            fill="white"
            mask={`url(#${maskId})`}
          >
            {text}
          </text>
        )}
      </svg>
    </span>
  );
};
