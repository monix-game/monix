import React, { useEffect } from 'react';
import styles from './Resource.module.css';
import type { ResourceInfo } from '../../../../server/common/resources';
import { getResourceQuantity } from '../../../helpers/resource';
import { EmojiText } from '../../EmojiText';
import { smartFormatNumber } from '../../../../server/common/math';

interface ResourceProps {
  info: ResourceInfo;
  price: number;
  changePct?: number;
  setMarketModalResource: (resource: ResourceInfo) => void;
  setMarketModalOpen: (open: boolean) => void;
}

export const Resource: React.FC<ResourceProps> = ({
  info,
  price,
  changePct,
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
        setQuantityShort(smartFormatNumber(qty || 0, false));
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
    <div
      className={styles.resource}
      onClick={() => {
        setMarketModalResource(info);
        setMarketModalOpen(true);
      }}
      {...props}
    >
      <div className={styles['resource-info']}>
        <span className={styles['resource-icon']}>
          <EmojiText>{info.icon}</EmojiText>
        </span>
        <span className={styles['resource-name']}>{info.name}</span>
      </div>
      <div className={styles['resource-amount']}>
        <span className={styles['resource-quantity']}>{quantityShort}</span>
        <span className={styles['resource-unit']}>{unit}</span>
      </div>
      <div className={styles['resource-price']}>
        <small>PRICE</small>
        <div className={styles['resource-change-row']}>
          <span className={`${styles['resource-price-amount']} mono`}>
            {smartFormatNumber(price || 0, false, true)}
          </span>
          {changePct !== undefined && (
            <span
              className={`${styles['resource-change']} ${
                changePct >= 0 ? styles.up : styles.down
              }`}
            >
              {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <div className={styles['resource-value']}>
        <small>VALUE</small>
        <span className="mono">{valueShort}</span>
      </div>
    </div>
  );
};
