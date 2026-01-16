import React, { useEffect } from 'react';
import './Resource.css';
import type { ResourceInfo } from '../../../server/common/resources';
import { getResourceQuantity } from '../../helpers/resource';
import { EmojiText } from '../EmojiText';
import { smartFormatNumber } from '../../helpers/numbers';

interface ResourceProps {
  info: ResourceInfo;
  price: number;
  setMarketModalResource: (resource: ResourceInfo) => void;
  setMarketModalOpen: (open: boolean) => void;
}

export const Resource: React.FC<ResourceProps> = ({
  info,
  price,
  setMarketModalResource,
  setMarketModalOpen,
  ...props
}) => {
  const [quantity, setQuantity] = React.useState<number>(0);
  const [quantityShort, setQuantityShort] = React.useState<string>('0');
  const [valueShort, setValueShort] = React.useState<string>('0');

  useEffect(() => {
    const fetchQuantity = async () => {
      await getResourceQuantity(info.id).then(qty => {
        setQuantity(qty || 0);
        setQuantityShort(smartFormatNumber(qty || 0));
        setValueShort(smartFormatNumber((qty || 0) * price));
      });
    };
    void fetchQuantity();
  }, [info.id, price]);

  let unit = info.unit;
  if (unit.endsWith('s') && quantity == 1) {
    unit = unit.slice(0, -1);
  }

  return (
    <>
      <div
        className="resource"
        onClick={() => {
          setMarketModalResource(info);
          setMarketModalOpen(true);
        }}
        {...props}
      >
        <div className="resource-info">
          <span className="resource-icon">
            <EmojiText>{info.icon}</EmojiText>
          </span>
          <span className="resource-name">{info.name}</span>
        </div>
        <div className="resource-amount">
          <span className="resource-quantity">{quantityShort}</span>
          <span className="resource-unit">{unit}</span>
        </div>
        <div className="resource-value">
          <small>VALUE</small>
          <span className="mono">{valueShort}</span>
        </div>
      </div>
    </>
  );
};
