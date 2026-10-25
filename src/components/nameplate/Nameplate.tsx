import React, { useLayoutEffect, useMemo, useRef, useState, useId } from 'react';
import styles from './Nameplate.module.css';

type GradientStop = {
  offset: string;
  color: string;
};

/**
 * Plates drawn behind the nameplate text. The SVG viewBox is grown to fit, so
 * these only need to describe fills — sizing is handled by the component.
 */
const NAMEPLATE_BACKGROUNDS: Record<string, { light: GradientStop[]; dark: GradientStop[] }> = {
  gold: {
    light: [
      { offset: '0%', color: '#fff1b8' },
      { offset: '55%', color: '#f0cf72' },
      { offset: '100%', color: '#d3a53a' },
    ],
    dark: [
      { offset: '0%', color: '#6b4f14' },
      { offset: '55%', color: '#4a360c' },
      { offset: '100%', color: '#2b1f05' },
    ],
  },
  sakura: {
    light: [
      { offset: '0%', color: '#ffe6f0' },
      { offset: '55%', color: '#fbc4da' },
      { offset: '100%', color: '#f0a3c2' },
    ],
    dark: [
      { offset: '0%', color: '#64223c' },
      { offset: '55%', color: '#451427' },
      { offset: '100%', color: '#280a16' },
    ],
  },
  ember: {
    light: [
      { offset: '0%', color: '#f3b183' },
      { offset: '100%', color: '#c0562a' },
    ],
    dark: [
      { offset: '0%', color: '#7a2f12' },
      { offset: '100%', color: '#40180a' },
    ],
  },
  ice: {
    light: [
      { offset: '0%', color: '#d6f1fb' },
      { offset: '100%', color: '#8cc7e0' },
    ],
    dark: [
      { offset: '0%', color: '#1d4f6b' },
      { offset: '100%', color: '#0d2b3c' },
    ],
  },
  forest: {
    light: [
      { offset: '0%', color: '#c3e6c8' },
      { offset: '100%', color: '#6fae7c' },
    ],
    dark: [
      { offset: '0%', color: '#1e5730' },
      { offset: '100%', color: '#0e2c1a' },
    ],
  },
  sunset: {
    light: [
      { offset: '0%', color: '#ffd9a8' },
      { offset: '100%', color: '#e08a4c' },
    ],
    dark: [
      { offset: '0%', color: '#7a3f18' },
      { offset: '100%', color: '#3d1f0d' },
    ],
  },
  void: {
    light: [
      { offset: '0%', color: '#b79ae0' },
      { offset: '100%', color: '#4a2f75' },
    ],
    dark: [
      { offset: '0%', color: '#2b1a48' },
      { offset: '100%', color: '#120b21' },
    ],
  },
};

/** Extra viewBox room, in px, needed to draw a background plate. */
const BACKGROUND_PADDING_X = 7;
/** Vertical plate room as a fraction of the font size, so the plate scales with the text. */
const BACKGROUND_PADDING_Y_RATIO = 0.28;

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
  rainbow: {
    light: [
      { offset: '0%', color: '#ff3b30' },
      { offset: '16%', color: '#ff9500' },
      { offset: '33%', color: '#ffcc00' },
      { offset: '50%', color: '#34c759' },
      { offset: '67%', color: '#0a84ff' },
      { offset: '84%', color: '#5856d6' },
      { offset: '100%', color: '#ff2d55' },
    ],
    dark: [
      { offset: '0%', color: '#ff6b6b' },
      { offset: '16%', color: '#ffb347' },
      { offset: '33%', color: '#ffe066' },
      { offset: '50%', color: '#7dff9b' },
      { offset: '67%', color: '#66b3ff' },
      { offset: '84%', color: '#9b8cff' },
      { offset: '100%', color: '#ff7ba1' },
    ],
  },
};

interface NameplateProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  styleKey?: string | null;
  backgroundKey?: string | null;
}

export const Nameplate: React.FC<NameplateProps> = ({
  text,
  styleKey,
  backgroundKey,
  className,
  ...rest
}) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const gradientId = useId();
  const shineId = useId();
  const maskId = useId();
  const backgroundId = useId();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const theme = root.dataset.theme as 'light' | 'dark' | undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDarkMode(theme !== 'light');
  }, []);

  const gradientStops = useMemo(() => {
    if (!styleKey && !backgroundKey) return null;
    const gradients = styleKey ? NAMEPLATE_GRADIENTS[styleKey] : null;
    if (!gradients) {
      // Background-only plates still need a text colour, so fall back to gold.
      return NAMEPLATE_GRADIENTS.gold[isDarkMode ? 'dark' : 'light'];
    }
    return gradients[isDarkMode ? 'dark' : 'light'];
  }, [styleKey, backgroundKey, isDarkMode]);

  const backgroundStops = useMemo(() => {
    if (!backgroundKey) return null;
    const background = NAMEPLATE_BACKGROUNDS[backgroundKey];
    if (!background) return null;
    return background[isDarkMode ? 'dark' : 'light'];
  }, [backgroundKey, isDarkMode]);

  useLayoutEffect(() => {
    if (!wrapperRef.current || !textRef.current || !gradientStops) return;
    const computed = globalThis.getComputedStyle(wrapperRef.current);
    const nextFontSize = Number.parseFloat(computed.fontSize || '16');
    const length = textRef.current.getComputedTextLength();
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
  const isRainbowStyle = styleKey === 'rainbow';

  // A background plate needs the viewBox to grow outwards so the plate is not
  // clipped by the tight text-only viewBox. The plate is also allowed to render
  // at its intrinsic height (see the `--plate` class) so it reads taller than
  // the text line instead of being squashed back down to 1em.
  const hasBackground = Boolean(backgroundStops);
  const backgroundPaddingY = hasBackground ? height * BACKGROUND_PADDING_Y_RATIO : 0;
  const viewBoxX = hasBackground ? -BACKGROUND_PADDING_X : 0;
  const viewBoxY = hasBackground ? -backgroundPaddingY : 0;
  const viewBoxWidth = width + (hasBackground ? BACKGROUND_PADDING_X * 2 : 0);
  const viewBoxHeight = height + (hasBackground ? backgroundPaddingY * 2 : 0);

  return (
    <span
      ref={wrapperRef}
      className={`${styles['nameplate-svg']} ${className || ''}`}
      aria-label={text}
      {...rest}
    >
      <svg
        className={`${styles['nameplate-svg__svg']} ${
          hasBackground ? styles['nameplate-svg__svg--plate'] : ''
        } nameplate-svg__svg--shiny`}
        width={viewBoxWidth}
        height={viewBoxHeight}
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={backgroundId} x1="0" x2="0" y1="0" y2="1">
            {backgroundStops?.map(stop => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            {isRainbowStyle && (
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                values="0 0.5 0.5;360 0.5 0.5"
                dur="6s"
                repeatCount="indefinite"
              />
            )}
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
        {backgroundStops && (
          <rect
            x={viewBoxX}
            y={viewBoxY}
            width={viewBoxWidth}
            height={viewBoxHeight}
            rx={Math.max(4, height * 0.4)}
            fill={`url(#${backgroundId})`}
          />
        )}
        <text
          ref={textRef}
          x={1}
          y={height * 0.8}
          className={styles['nameplate-svg__text']}
          fill={`url(#${gradientId})`}
        >
          {text}
        </text>
        {styleKey && (
          <text
            x={1}
            y={height * 0.8}
            className={`${styles['nameplate-svg__text']} ${styles['nameplate-svg__text--shine']}`}
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
