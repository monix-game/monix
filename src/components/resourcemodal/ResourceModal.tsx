import React from 'react';
import styles from './ResourceModal.module.css';
import type { ResourceInfo } from '../../../server/common/resources';
import { Button, EmojiText, Input, Modal } from '..';
import { buyResource, sellResource } from '../../helpers/resource';
import { smartFormatNumber } from '../../../server/common/math';

interface ResourceModalProps {
  resource: ResourceInfo;
  quantity: number;
  resourcePrice: number;
  money: number;
  isOpen: boolean;
  disableSeeMore?: boolean;
  onClose: () => void;
  onSeeMore: () => void;
  onBuySell: () => void;
}

export const ResourceModal: React.FC<ResourceModalProps> = ({
  resource,
  quantity,
  resourcePrice,
  money,
  isOpen,
  disableSeeMore = false,
  onClose,
  onSeeMore,
  onBuySell,
  ...props
}) => {
  const [marketMode, setMarketMode] = React.useState<'buy' | 'sell'>('buy');
  const [marketQuantity, setMarketQuantity] = React.useState<number>(0);

  const onBuyButtonClick = async () => {
    await buyResource(resource.id, marketQuantity);
    setMarketMode('buy');
    setMarketQuantity(0);
    onBuySell();
    onClose();
  };

  const onSellButtonClick = async () => {
    await sellResource(resource.id, marketQuantity);
    setMarketMode('buy');
    setMarketQuantity(0);
    onBuySell();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} {...props}>
      <div className="market-modal">
        <div className="market-header">
          <h2 className={styles['market-title']}>
            <EmojiText>{resource.icon}</EmojiText> <span>{resource.name}</span>
          </h2>
          <div className={styles['market-switches']}>
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
        <div className="market-content">
          {marketMode === 'buy' ? (
            <div className="buy-section">
              <div className={styles['market-resource-info']}>
                <span className={styles['market-resource-name']}>{resource.name}</span>
                <span className={`${styles['market-resource-value']} mono`}>
                  {smartFormatNumber(resourcePrice)} per{' '}
                  {resource.unit.endsWith('s') ? resource.unit.slice(0, -1) : resource.unit}
                </span>
              </div>
              <Input
                type="number"
                min="1"
                value={marketQuantity === 0 ? '' : marketQuantity.toString()}
                placeholder="Quantity to buy"
                className={styles['market-input']}
                onValueChange={value => setMarketQuantity(Number(value))}
              />
              <div className={styles['market-quantity-controls']}>
                <Button
                  className={styles['market-quantity-button']}
                  onClick={() => {
                    // Calculate 10% of affordable quantity
                    const affordableQuantity = Math.floor(money / resourcePrice);
                    const tenPercent = Math.max(1, Math.floor(affordableQuantity * 0.1));
                    setMarketQuantity(tenPercent);
                  }}
                >
                  10% of money
                </Button>
                <Button
                  className={styles['market-quantity-button']}
                  onClick={() => {
                    // Calculate 50% of affordable quantity
                    const affordableQuantity = Math.floor(money / resourcePrice);
                    const fiftyPercent = Math.max(1, Math.floor(affordableQuantity * 0.5));
                    setMarketQuantity(fiftyPercent);
                  }}
                >
                  50% of money
                </Button>
                <Button
                  className={styles['market-quantity-button']}
                  onClick={() => {
                    // Calculate 100% of affordable quantity
                    const affordableQuantity = Math.floor(money / resourcePrice);
                    setMarketQuantity(affordableQuantity);
                  }}
                >
                  All
                </Button>
              </div>
              {marketQuantity > 0 && (
                <p className={styles['market-total-cost']}>
                  Total Cost:{' '}
                  <span className="mono">{smartFormatNumber(resourcePrice * marketQuantity)}</span>{' '}
                  for {smartFormatNumber(marketQuantity, false)}{' '}
                  {resource.unit.endsWith('s') && marketQuantity == 1
                    ? resource.unit.slice(0, -1)
                    : resource.unit}
                </p>
              )}
              <div className={styles['market-buttons']}>
                <Button
                  className={styles['market-button']}
                  disabled={resourcePrice * marketQuantity > money || marketQuantity === 0}
                  onClickAsync={onBuyButtonClick}
                >
                  Confirm Purchase
                </Button>
                {!disableSeeMore && (
                  <Button
                    className={styles['market-button']}
                    onClick={() => {
                      onClose();
                      onSeeMore();
                    }}
                  >
                    See More
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="sell-section">
              {quantity === 0 && (
                <p className={styles['market-no-quantity']}>
                  You have no {resource.name.toLowerCase()} to sell.
                </p>
              )}
              {quantity > 0 && (
                <div>
                  <div className={styles['market-resource-info']}>
                    <span className={styles['market-resource-name']}>{resource.name}</span>
                    <span className={`${styles['market-resource-value']} mono`}>
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
                    className={styles['market-input']}
                    onValueChange={value => setMarketQuantity(Number(value))}
                  />
                  <div className={styles['market-quantity-controls']}>
                    <Button
                      className={styles['market-quantity-button']}
                      onClick={() => {
                        // Calculate 10% of available quantity
                        const tenPercent = Math.max(1, Math.floor(quantity * 0.1));
                        setMarketQuantity(tenPercent);
                      }}
                    >
                      10% of quantity
                    </Button>
                    <Button
                      className={styles['market-quantity-button']}
                      onClick={() => {
                        // Calculate 50% of available quantity
                        const fiftyPercent = Math.max(1, Math.floor(quantity * 0.5));
                        setMarketQuantity(fiftyPercent);
                      }}
                    >
                      50% of quantity
                    </Button>
                    <Button
                      className={styles['market-quantity-button']}
                      onClick={() => {
                        // Calculate 100% of available quantity
                        setMarketQuantity(quantity);
                      }}
                    >
                      All
                    </Button>
                  </div>
                  {marketQuantity > 0 && (
                    <p className={styles['market-total-cost']}>
                      Total Value:{' '}
                      <span className="mono">
                        {smartFormatNumber(resourcePrice * marketQuantity)}
                      </span>{' '}
                      for {smartFormatNumber(marketQuantity, false)}{' '}
                      {resource.unit.endsWith('s') && marketQuantity == 1
                        ? resource.unit.slice(0, -1)
                        : resource.unit}
                    </p>
                  )}
                  <div className={styles['market-buttons']}>
                    <Button
                      className={styles['market-button']}
                      disabled={marketQuantity > quantity || marketQuantity === 0}
                      onClickAsync={onSellButtonClick}
                    >
                      Confirm Sale
                    </Button>
                    {!disableSeeMore && (
                      <Button
                        className={styles['market-button']}
                        onClick={() => {
                          onClose();
                          onSeeMore();
                        }}
                      >
                        See More
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
