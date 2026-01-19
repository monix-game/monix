import React from 'react';
import './ResourceModal.css';
import type { ResourceInfo } from '../../../server/common/resources';
import { Button, EmojiText, Input, Modal } from '..';
import { buyResource, sellResource } from '../../helpers/resource';
import { smartFormatNumber } from '../../helpers/utils';

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
          <h2 className="market-title">
            <EmojiText>{resource.icon}</EmojiText> <span>{resource.name}</span>
          </h2>
          <div className="market-switches">
            <span
              className={marketMode === 'buy' ? 'switch active' : 'switch'}
              onClick={() => setMarketMode('buy')}
            >
              Buy
            </span>
            <span
              className={marketMode === 'sell' ? 'switch active' : 'switch'}
              onClick={() => setMarketMode('sell')}
            >
              Sell
            </span>
          </div>
        </div>
        <div className="market-content">
          {marketMode === 'buy' ? (
            <div className="buy-section">
              <div className="market-resource-info">
                <span className="market-resource-name">{resource.name}</span>
                <span className="market-resource-value mono">
                  {smartFormatNumber(resourcePrice)} per{' '}
                  {resource.unit.endsWith('s') ? resource.unit.slice(0, -1) : resource.unit}
                </span>
              </div>
              <Input
                type="number"
                min="1"
                value={marketQuantity === 0 ? '' : marketQuantity}
                placeholder="Quantity to buy"
                className="market-input"
                onValueChange={value => setMarketQuantity(Number(value))}
              />
              {marketQuantity > 0 && (
                <p className="market-total-cost">
                  Total Cost:{' '}
                  <span className="mono">{smartFormatNumber(resourcePrice * marketQuantity)}</span>{' '}
                  for {smartFormatNumber(marketQuantity, false)}{' '}
                  {resource.unit.endsWith('s') && marketQuantity == 1
                    ? resource.unit.slice(0, -1)
                    : resource.unit}
                </p>
              )}
              <div className="market-buttons">
                <Button
                  className="market-button"
                  disabled={resourcePrice * marketQuantity > money || marketQuantity === 0}
                  onClickAsync={onBuyButtonClick}
                >
                  Confirm Purchase
                </Button>
                {!disableSeeMore && (
                  <Button
                    className="market-button"
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
                <p className="market-no-quantity">
                  You have no {resource.name.toLowerCase()} to sell.
                </p>
              )}
              {quantity > 0 && (
                <div>
                  <div className="market-resource-info">
                    <span className="market-resource-name">{resource.name}</span>
                    <span className="market-resource-value mono">
                      {smartFormatNumber(resourcePrice)} per{' '}
                      {resource.unit.endsWith('s') ? resource.unit.slice(0, -1) : resource.unit}
                    </span>
                  </div>

                  <Input
                    type="number"
                    min="1"
                    value={marketQuantity === 0 ? '' : marketQuantity}
                    max={quantity}
                    placeholder="Quantity to sell"
                    className="market-input"
                    onValueChange={value => setMarketQuantity(Number(value))}
                  />
                  {marketQuantity > 0 && (
                    <p className="market-total-cost">
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
                  <div className="market-buttons">
                    <Button
                      className="market-button"
                      disabled={marketQuantity > quantity || marketQuantity === 0}
                      onClickAsync={onSellButtonClick}
                    >
                      Confirm Sale
                    </Button>
                    {!disableSeeMore && (
                      <Button
                        className="market-button"
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
