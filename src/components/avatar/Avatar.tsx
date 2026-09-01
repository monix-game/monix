import React, { useLayoutEffect, useMemo, useRef, useState, useId } from 'react';
import styles from './Avatar.module.css';
import { IconUser } from '@tabler/icons-react';

interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  size?: number;
  alt?: string;
  styleKey?: string | null;
}

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
    let baseClass = styles.avatar;
    if (styleKey) {
      baseClass += ` avatar--${styleKey}`;
    }
    if (className) {
      baseClass += ` ${className}`;
    }
    return baseClass;
  }, [styleKey, className]);

  const mergedStyle = {
    ...rest.style,
    '--avatar-size': `${size}px`,
  } as React.CSSProperties;

  return (
    <span className={avatarClassName} {...rest} style={mergedStyle}>
      <span className={styles['avatar__image']}>
        {/* eslint-disable-next-line react-hooks/refs */}
        {isLoaded && imgRef.current && src ? (
          <img src={src} alt={alt} id={`avatar-img-${uniqueId}`} />
        ) : (
          <IconUser className={styles['avatar-placeholder']} size={size} />
        )}
      </span>
    </span>
  );
};
