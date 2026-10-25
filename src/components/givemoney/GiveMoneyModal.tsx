import React, { useRef, useState } from 'react';
import styles from './GiveMoneyModal.module.css';
import { Modal } from '../modal/Modal';
import { Button } from '../button/Button';
import { Input } from '../input/Input';
import { EmojiText } from '../EmojiText';
import { smartFormatNumber } from '../../../server/common/math';
import { transferMoney } from '../../helpers/money';

interface GiveMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  currentUsername: string;
  onSent: () => void | Promise<void>;
}

export const GiveMoneyModal: React.FC<GiveMoneyModalProps> = ({
  isOpen,
  onClose,
  balance,
  currentUsername,
  onSent,
}) => {
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSending, setIsSending] = useState(false);
  // Ref guard so a double click / repeated Enter cannot fire two transfers
  // before React has re-rendered the disabled button.
  const sendingRef = useRef(false);

  const resetFeedback = () => {
    setError('');
    setSuccess('');
  };

  const close = () => {
    if (isSending) return;
    resetFeedback();
    onClose();
  };

  const sendMoney = async () => {
    if (sendingRef.current) return;
    resetFeedback();

    const target = username.trim();
    const value = Number(amount);

    if (!target) {
      setError('Enter the username of the person you want to pay.');
      return;
    }
    if (target === currentUsername) {
      setError("You can't send money to yourself.");
      return;
    }
    if (!Number.isSafeInteger(value) || value <= 0) {
      setError('Enter a whole-dollar amount greater than zero.');
      return;
    }
    if (value > balance) {
      setError("You don't have enough money for that.");
      return;
    }

    sendingRef.current = true;
    setIsSending(true);
    try {
      const result = await transferMoney(target, value);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess(result.message);
      setAmount('');
      await onSent();
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} ariaLabel="Give money to another user" width={440}>
      <div className={styles['give-money']}>
        <header className={styles['give-money-header']}>
          <h2>
            <EmojiText>💸</EmojiText> Give Money
          </h2>
          <p>Send money directly to another player. Transfers happen instantly.</p>
        </header>

        <div className={styles['give-money-balance']}>
          <span>Your balance</span>
          <span className="mono">{smartFormatNumber(balance, true, false, false)}</span>
        </div>

        <form
          className={styles['give-money-form']}
          onSubmit={e => {
            e.preventDefault();
            void sendMoney();
          }}
        >
          <Input
            label="Recipient username"
            value={username}
            onValueChange={value => {
              setUsername(value);
              resetFeedback();
            }}
            placeholder="Username"
            maxLength={15}
            disabled={isSending}
            autoComplete="off"
          />
          <Input
            label="Amount"
            value={amount}
            onValueChange={value => {
              setAmount(value.replace(/[^0-9]/g, ''));
              resetFeedback();
            }}
            placeholder="0"
            inputMode="numeric"
            disabled={isSending}
            autoComplete="off"
          />

          {error && (
            <p className={styles['give-money-error']} role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className={styles['give-money-success']} role="status">
              <EmojiText>✅</EmojiText> {success}
            </p>
          )}

          <p className={styles['give-money-note']}>
            Make sure the username is correct — money cannot be recovered once it has been sent.
          </p>

          <div className={styles['give-money-actions']}>
            <Button type="button" secondary onClick={close} disabled={isSending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClickAsync={sendMoney}
              isLoading={isSending}
              disabled={!username.trim() || amount === ''}
            >
              Send Money
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default GiveMoneyModal;
