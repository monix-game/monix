import React from 'react';
import styles from './BuySellPanel.module.css';
import type { ResourceInfo } from '../../../server/common/resources';
import { Button, EmojiText, Input } from '..';
import { buyResource, sellResource } from '../../helpers/resource';
import { smartFormatNumber } from '../../../server/common/math';

interface BuySellPanelProps {
  resource: ResourceInfo;
  quantity: number;
  resourcePrice: number;
  money: number;
  onBuySell: () => void;
}

export const BuySellPanel: React.FC<BuySellPanelProps> = ({
  resource,
  quantity,
  resourcePrice,
  money,
  onBuySell,
}) => {
  const [marketMode, setMarketMode] = React.useState<'buy' | 'sell'>('buy');
  const [marketQuantity, setMarketQuantity] = React.useState<number>(0);

  const onBuyButtonClick = async () => {
    await buyResource(resource.id, marketQuantity);
    setMarketMode('buy');
    setMarketQuantity(0);
    onBuySell();
  };

  const onSellButtonClick = async () => {
    await sellResource(resource.id, marketQuantity);
    setMarketMode('buy');
    setMarketQuantity(0);
    onBuySell();
  };

  return (
    <div className={styles['panel']}>
      <div className={styles['header']}>
        <h2 className={styles['title']}>
          <EmojiText>{resource.icon}</EmojiText> <span>{resource.name}</span>
        </h2>
        <div className={styles['switches']}>
          <span
            className={marketMode === 'buy' ? `${styles.switch} ${styles.active}` : styles.switch}
            onClick={() => setMarketMode('buy')}
          >
            Buy
          </span>
          <span
            className={marketMode === 'sell' ? `${styles.switch} ${styles.active}` : styles.switch}
            onClick={() => setMarketMode('sell')}
          >
            Sell
          </span>
        </div>
      </div>
      <div className={styles['content']}>
        {marketMode === 'buy' ? (
          <div>
            <div className={styles['resource-info']}>
              <span className={styles['resource-name']}>{resource.name}</span>
              <span className={`${styles['resource-value']} mono`}>
                {smartFormatNumber(resourcePrice)} per{' '}
                {resource.unit.endsWith('s') ? resource.unit.slice(0, -1) : resource.unit}
              </span>
            </div>
            <Input
              type="number"
              min="1"
              value={marketQuantity === 0 ? '' : marketQuantity.toString()}
              placeholder="Quantity to buy"
              className={styles['input']}
              onValueChange={value => setMarketQuantity(Number(value))}
            />
            <div className={styles['quantity-controls']}>
              <Button
                className={styles['quantity-button']}
                onClick={() => {
                  const affordableQuantity = Math.floor(money / resourcePrice);
                  const tenPercent = Math.max(1, Math.floor(affordableQuantity * 0.1));
                  setMarketQuantity(tenPercent);
                }}
              >
                10% of money
              </Button>
              <Button
                className={styles['quantity-button']}
                onClick={() => {
                  const affordableQuantity = Math.floor(money / resourcePrice);
                  const fiftyPercent = Math.max(1, Math.floor(affordableQuantity * 0.5));
                  setMarketQuantity(fiftyPercent);
                }}
              >
                50% of money
              </Button>
              <Button
                className={styles['quantity-button']}
                onClick={() => {
                  const affordableQuantity = Math.floor(money / resourcePrice);
                  setMarketQuantity(affordableQuantity);
                }}
              >
                All
              </Button>
            </div>
            {marketQuantity > 0 && (
              <p className={styles['total-cost']}>
                Total Cost:{' '}
                <span className="mono">{smartFormatNumber(resourcePrice * marketQuantity)}</span>{' '}
                for {smartFormatNumber(marketQuantity, false)}{' '}
                {resource.unit.endsWith('s') && marketQuantity == 1
                  ? resource.unit.slice(0, -1)
                  : resource.unit}
              </p>
            )}
            <Button
              className={styles['action-button']}
              disabled={resourcePrice * marketQuantity > money || marketQuantity === 0}
              onClickAsync={onBuyButtonClick}
            >
              Confirm Purchase
            </Button>
          </div>
        ) : (
          <div>
            {quantity === 0 && (
              <p className={styles['no-quantity']}>
                You have no {resource.name.toLowerCase()} to sell.
              </p>
            )}
            {quantity > 0 && (
              <div>
                <div className={styles['resource-info']}>
                  <span className={styles['resource-name']}>{resource.name}</span>
                  <span className={`${styles['resource-value']} mono`}>
                    {smartFormatNumber(resourcePrice)} per{' '}
                    {resource.unit.endsWith('s') ? resource.unit.slice(0, -1) : resource.unit}
                  </span>
                </div>

                <Input
                  type="number"
                  min="1"
                  value={marketQuantity === 0 ? '' : marketQuantity.toString()}
                  max={quantity}
                  placeholder="Quantity to sell"
                  className={styles['input']}
                  onValueChange={value => setMarketQuantity(Number(value))}
                />
                <div className={styles['quantity-controls']}>
                  <Button
                    className={styles['quantity-button']}
                    onClick={() => {
                      const tenPercent = Math.max(1, Math.floor(quantity * 0.1));
                      setMarketQuantity(tenPercent);
                    }}
                  >
                    10% of quantity
                  </Button>
                  <Button
                    className={styles['quantity-button']}
                    onClick={() => {
                      const fiftyPercent = Math.max(1, Math.floor(quantity * 0.5));
                      setMarketQuantity(fiftyPercent);
                    }}
                  >
                    50% of quantity
                  </Button>
                  <Button
                    className={styles['quantity-button']}
                    onClick={() => {
                      setMarketQuantity(quantity);
                    }}
                  >
                    All
                  </Button>
                </div>
                {marketQuantity > 0 && (
                  <p className={styles['total-cost']}>
                    Total Value:{' '}
                    <span className="mono">{smartFormatNumber(resourcePrice * marketQuantity)}</span>{' '}
                    for {smartFormatNumber(marketQuantity, false)}{' '}
                    {resource.unit.endsWith('s') && marketQuantity == 1
                      ? resource.unit.slice(0, -1)
                      : resource.unit}
                  </p>
                )}
                <Button
                  className={styles['action-button']}
                  disabled={marketQuantity > quantity || marketQuantity === 0}
                  onClickAsync={onSellButtonClick}
                >
                  Confirm Sale
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};