import React, { useEffect } from 'react';
import './Resource.css';
import type { ResourceInfo } from '../../../server/common/resources';
import { getResourceQuantity } from '../../helpers/resource';
import { EmojiText } from '../EmojiText';
import { Modal } from '../modal/Modal';
import { Input } from '../input/Input';
import { Button } from '../button/Button';

interface ResourceProps {
  info: ResourceInfo;
  value: number;
  money: number;
  resourcePrice: number;
}

export const Resource: React.FC<ResourceProps> = ({
  info,
  value,
  money,
  resourcePrice,
  ...props
}) => {
  const [quantity, setQuantity] = React.useState<number>(0);
  const [marketModalOpen, setMarketModalOpen] = React.useState<boolean>(false);
  const [marketMode, setMarketMode] = React.useState<'buy' | 'sell'>('buy');
  const [marketQuantity, setMarketQuantity] = React.useState<number>(1);

  useEffect(() => {
    const fetchQuantity = async () => {
      await getResourceQuantity(info.id).then(qty => {
        setQuantity(qty || 0);
      });
    };
    void fetchQuantity();
  }, [info.id]);

  let unit = info.unit;
  if (unit.endsWith('s') && quantity == 1) {
    unit = unit.slice(0, -1);
  }

  return (
    <>
      <div className="resource" onClick={() => setMarketModalOpen(true)} {...props}>
        <div className="resource-info">
          <span className="resource-icon">
            <EmojiText>{info.icon}</EmojiText>
          </span>
          <span className="resource-name">{info.name}</span>
        </div>
        <div className="resource-amount">
          <span className="resource-quantity">{quantity}</span>
          <span className="resource-unit">{unit}</span>
        </div>
        <div className="resource-value">
          <small>VALUE</small>
          <span className="mono">${value.toFixed(2)}</span>
        </div>
      </div>

      <Modal
        isOpen={marketModalOpen}
        onClose={() => {
          setMarketModalOpen(false);
          setMarketMode('buy');
          setMarketQuantity(1);
        }}
      >
        <div className="market-modal">
          <div className="market-header">
            <h2 className="market-title">
              <EmojiText>{info.icon}</EmojiText> <span>{info.name}</span>
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
                  <span className="market-resource-name">{info.name}</span>
                  <span className="market-resource-value mono">
                    ${resourcePrice.toFixed(2)} per {unit.endsWith('s') ? unit.slice(0, -1) : unit}
                  </span>
                </div>
                <Input
                  type="number"
                  min="1"
                  placeholder="Quantity to buy"
                  className="market-input"
                  onValueChange={value => setMarketQuantity(Number(value))}
                />
                <p className="market-total-cost">
                  Total Cost:{' '}
                  <span className="mono">${(resourcePrice * marketQuantity).toFixed(2)}</span> for{' '}
                  {marketQuantity}{' '}
                  {unit.endsWith('s') && marketQuantity == 1 ? unit.slice(0, -1) : unit}
                </p>
                <Button className="market-button" disabled={resourcePrice * marketQuantity > money}>
                  Confirm Purchase
                </Button>
              </div>
            ) : (
              <div className="sell-section">
                {quantity === 0 && (
                  <p className="market-no-quantity">
                    You have no {info.name.toLowerCase()} to sell.
                  </p>
                )}
                {quantity > 0 && (
                  <div>
                    <div className="market-resource-info">
                      <span className="market-resource-name">{info.name}</span>
                      <span className="market-resource-value mono">
                        ${resourcePrice.toFixed(2)} per{' '}
                        {unit.endsWith('s') ? unit.slice(0, -1) : unit}
                      </span>
                    </div>

                    <Input
                      type="number"
                      min="1"
                      max={quantity}
                      placeholder="Quantity to sell"
                      className="market-input"
                      onValueChange={value => setMarketQuantity(Number(value))}
                    />
                    <p className="market-total-cost">
                      Total Value:{' '}
                      <span className="mono">${(resourcePrice * marketQuantity).toFixed(2)}</span>{' '}
                      for {marketQuantity}{' '}
                      {unit.endsWith('s') && marketQuantity == 1 ? unit.slice(0, -1) : unit}
                    </p>
                    <Button className="market-button" disabled={marketQuantity > quantity}>
                      Confirm Sale
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
