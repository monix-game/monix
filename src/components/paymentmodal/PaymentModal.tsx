import React from 'react';
import './PaymentModal.css';
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
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="payment-modal">
        <span className="review-subtitle">Review</span>
        <h3>Purchase Details</h3>
        <div className="payment-section">
          <div className="payment-section-left">{productName}</div>
          <div className="payment-section-right">
            {type === 'gems' ? (
              <div className="payment-gems-amount">
                <IconDiamond size={20} />
                {smartFormatNumber(amount, false, false, false)}
              </div>
            ) : (
              smartFormatNumber(amount, true, false, false)
            )}
          </div>
        </div>
        <h3>Pay With</h3>
        <div className="payment-section">
          <div className="payment-section-left">
            {type === 'gems' ? 'Gems Balance' : 'Virtual Money Balance'}
          </div>
          <div className="payment-section-right">
            {type === 'gems' ? (
              <div className="payment-gems-amount">
                <IconDiamond size={20} />
                {smartFormatNumber(balance, false, true, false)}
              </div>
            ) : (
              smartFormatNumber(balance, true, false, false)
            )}
          </div>
        </div>
        <span className="payment-disclaimer">
          Pressing the purchase button means you're claiming a limited license to use this product/item in
          Monix.{' '}
          <span className="payment-disclaimer-secondary">
            Purchases are non-refundable. Once purchased, items will be delivered to your account
            within 24 hours.
          </span>
        </span>
        <div className="payment-actions">
          <div className="payment-secure">
            <IconLock />
            <span>Secure</span>
          </div>
          <Button
            onClickAsync={onPurchase}
            isLoading={isLoading}
            disabled={!hasGems(balance, amount)}
          >
            {type === 'gems' ? 'Claim with Gems' : 'Buy Now'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
