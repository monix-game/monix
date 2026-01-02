import React, { useEffect, useRef } from 'react'
import twemoji from '@twemoji/api'

interface EmojiTextProps {
  children: React.ReactNode
}

const emojiCache: { [key: string]: string } = {}

const createEmoji = (emoji: string): string => {
  if (emojiCache[emoji]) {
    return emojiCache[emoji];
  }
  const parsed = twemoji.parse(emoji, {
    folder: "svg",
    ext: ".svg"
  }) as string;
  emojiCache[emoji] = parsed;
  return parsed;
}

export const EmojiText: React.FC<EmojiTextProps> = ({
  children
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (spanRef.current) {
      const emojiStr = typeof children === 'string' ? children : '';
      const emojiHTML = createEmoji(emojiStr);
      spanRef.current.innerHTML = emojiHTML;
    }
  }, [children]);

  return (
    <span ref={spanRef}></span>
  )
}
