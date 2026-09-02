import React from 'react';
import styles from './PaymentModal.module.css';
import { Modal } from '../modal/Modal';
import { Button } from '../button/Button';
import { hasGems, smartFormatNumber } from '../../../server/common/math';
import { IconDiamond, IconLock } from '@tabler/icons-react';

interface PaymentModalProps {
  isOpen: boolean;
  type: 'money' | 'gems';
  amount: number;
  balance: number;
  productName: string;
  onClose: () => void;
  onPurchase: () => Promise<void>;
  isLoading?: boolean;
  mode?: 'buy' | 'sell';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  type,
  amount,
  balance,
  productName,
  onClose,
  onPurchase,
  isLoading = false,
  mode = 'buy',
}) => {
  const isSell = mode === 'sell';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles['payment-modal']}>
        <span className={styles['review-subtitle']}>Review</span>
        <h3>{isSell ? 'Sale Details' : 'Purchase Details'}</h3>
        <div className={styles['payment-section']}>
          <div className={styles['payment-section-left']}>{productName}</div>
          <div className={styles['payment-section-right']}>
            {type === 'gems' ? (
              <div className={styles['payment-gems-amount']}>
                <IconDiamond size={20} />
                {smartFormatNumber(amount, false, false, false)}
              </div>
            ) : (
              smartFormatNumber(amount, true, false, false)
            )}
          </div>
        </div>
        <h3>{isSell ? 'You Will Receive' : 'Pay With'}</h3>
        <div className={styles['payment-section']}>
          <div className={styles['payment-section-left']}>
            {isSell ? 'New Balance' : type === 'gems' ? 'Gems Balance' : 'Virtual Money Balance'}
          </div>
          <div className={styles['payment-section-right']}>
            {type === 'gems' ? (
              <div className={styles['payment-gems-amount']}>
                <IconDiamond size={20} />
                {smartFormatNumber(isSell ? balance + amount : balance, false, true, false)}
              </div>
            ) : (
              smartFormatNumber(isSell ? balance + amount : balance, true, false, false)
            )}
          </div>
        </div>
        {isSell ? (
          <span className={styles['payment-disclaimer']}>
            Selling this item is final. The item will be removed from your account and the sale
            amount will be added to your balance immediately.
          </span>
        ) : (
          <span className={styles['payment-disclaimer']}>
            Pressing the purchase button means you're claiming a limited license to use this
            product/item in Monix.{' '}
            <span className={styles['payment-disclaimer-secondary']}>
              Purchases are non-refundable. Once purchased, items will be delivered to your account
              within 24 hours.
            </span>
          </span>
        )}
        <div className={styles['payment-actions']}>
          <div className={styles['payment-secure']}>
            <IconLock />
            <span>Secure</span>
          </div>
          <Button
            onClickAsync={onPurchase}
            isLoading={isLoading}
            disabled={!isSell && !hasGems(balance, amount)}
          >
            {isSell ? 'Sell Now' : type === 'gems' ? 'Claim with Gems' : 'Buy Now'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
