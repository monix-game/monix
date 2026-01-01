import React, { useEffect, useRef } from 'react'
import twemoji from '@twemoji/api'

interface EmojiTextProps {
  children: React.ReactNode
}

export const EmojiText: React.FC<EmojiTextProps> = ({
  children
}) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    twemoji.parse(ref.current, {
      folder: "svg",
      ext: ".svg"
    });
  }, [children]);

  return <span ref={ref}>{children}</span>;
}
