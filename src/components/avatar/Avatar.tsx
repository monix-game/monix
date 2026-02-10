import React, { useLayoutEffect, useMemo, useRef, useState, useId } from 'react';
import './Avatar.css';
import { IconUser } from '@tabler/icons-react';
import { darkFrame } from '../../assets/cosmetics';

interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  size?: number;
  alt?: string;
  styleKey?: string | null;
}

const frameAssets: { [key: string]: string } = {
  dark: darkFrame,
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  styleKey,
  size = 24,
  className,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const uniqueId = useId();

  useLayoutEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
    imgRef.current = img;
  }, [src]);

  const avatarClassName = useMemo(() => {
    let baseClass = 'avatar';
    if (styleKey) {
      baseClass += ` avatar--${styleKey}`;
    }
    if (className) {
      baseClass += ` ${className}`;
    }
    return baseClass;
  }, [styleKey, className]);

  const frameSrc = styleKey ? frameAssets[styleKey] : undefined;
  const mergedStyle = {
    ...rest.style,
    '--avatar-size': `${size}px`,
  } as React.CSSProperties;

  return (
    <span className={avatarClassName} {...rest} style={mergedStyle}>
      <span className="avatar__image">
        {/* eslint-disable-next-line react-hooks/refs */}
        {isLoaded && imgRef.current && src ? (
          <img src={src} alt={alt} id={`avatar-img-${uniqueId}`} />
        ) : (
          <IconUser className="avatar-placeholder" size={size} />
        )}
      </span>
      {frameSrc ? (
        <span
          className="avatar__frame"
          style={{ backgroundImage: `url(${frameSrc})` }}
          aria-hidden
        />
      ) : null}
    </span>
  );
};
