import React from 'react';
import styles from './GemCard.module.css';
import gemBanner from '../../assets/gem-banner.svg';
import { Button } from '../button/Button';

interface GemCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  amount: number;
  price: string;
  onClickAsync?: () => Promise<void>;
}

export const GemCard: React.FC<GemCardProps> = ({ amount, price, onClickAsync }) => {
  return (
    <div className={styles['gem-card']}>
      <div className={styles['gem-card-header']}>
        <img src={gemBanner} alt="Gem Banner" />
      </div>
      <div className={styles['gem-card-body']}>
        <h2 className={styles['gem-amount']}>{amount} Gems</h2>
        <Button className={styles['gem-card-button']} onClickAsync={onClickAsync}>
          Buy Now
        </Button>
        <span className={styles['gem-price']}>{price}</span>
      </div>
    </div>
  );
};
