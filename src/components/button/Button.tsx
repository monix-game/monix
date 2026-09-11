import React from 'react';
import styles from './Button.module.css';
import { Spinner } from '../spinner/Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  secondary?: boolean;
  color?: 'primary' | 'blue' | 'red' | 'purple';
  isLoading?: boolean;
  children: React.ReactNode;
  onClickAsync?: () => Promise<void>;
}

export const Button: React.FC<ButtonProps> = ({
  secondary = false,
  color = 'primary',
  isLoading = false,
  children,
  disabled,
  className,
  onClickAsync,
  ...props
}) => {
  const colorStyles = {
    primary: styles.primary,
    blue: styles.blue,
    red: styles.red,
    purple: styles.purple,
  } as const;
  const colorClass = colorStyles[color];

  return (
    <button
      className={`${styles.btn} ${secondary ? styles['btn-secondary'] : ''} ${colorClass} ${isLoading ? styles.loading : ''} ${className || ''}`}
      disabled={disabled || isLoading}
      onClick={() => {
        if (onClickAsync) {
          void onClickAsync();
        }
      }}
      {...props}
    >
      <span className={styles['btn-content']}>{children}</span>

      {isLoading && (
        <span className={styles['btn-loading-spinner']}>
          <Spinner size={16} />
        </span>
      )}
    </button>
  );
};
