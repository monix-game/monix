import React from 'react';
import './GemCard.css';
import gemBanner from '../../assets/gem-banner.svg';
import { Button } from '../button/Button';

interface GemCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  amount: number;
  price: string;
  onClickAsync?: () => Promise<void>;
}

export const GemCard: React.FC<GemCardProps> = ({ amount, price, onClickAsync }) => {
  return (
    <div className="gem-card">
      <div className="gem-card-header">
        <img src={gemBanner} alt="Gem Banner" />
      </div>
      <div className="gem-card-body">
        <h2 className="gem-amount">{amount} Gems</h2>
        <Button className="gem-card-button" onClickAsync={onClickAsync}>
          Buy Now
        </Button>
        <span className="gem-price">{price}</span>
      </div>
    </div>
  );
};
