import React, { useEffect, useState } from 'react';
import styles from './NewsTicker.module.css';
import { useSocket } from '../../providers/socket';
import type { MarketNewsFeed } from '../../../server/common/market/news';
import { EmojiText } from '../EmojiText';

export const NewsTicker: React.FC = () => {
  const { subscribe } = useSocket();
  const [feed, setFeed] = useState<MarketNewsFeed | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe('market:news', data => {
      setFeed(data as MarketNewsFeed);
    });
    return unsubscribe;
  }, [subscribe]);

  if (!feed || feed.items.length === 0) return null;

  const renderItems = (ariaHidden: boolean) => (
    <div className={styles.group} aria-hidden={ariaHidden}>
      {feed.items.map(item => {
        const direction =
          item.multiplier > 1.005 ? 'up' : item.multiplier < 0.995 ? 'down' : 'flat';
        return (
          <span
            key={item.id}
            className={`${styles.item} ${styles[`direction-${direction}`]} ${
              item.active ? styles.active : ''
            }`}
          >
            {item.icon && <EmojiText>{item.icon}</EmojiText>}
            <span className={styles.text}>{item.text}</span>
            <span className={styles.arrow}>
              {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—'}
            </span>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className={styles.ticker} role="region" aria-label="Market news">
      <div className={styles.track}>
        {renderItems(false)}
        {renderItems(true)}
      </div>
    </div>
  );
};

export default NewsTicker;