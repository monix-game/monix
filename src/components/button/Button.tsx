import React from 'react';
import './Button.css';
import { Spinner } from '../spinner/Spinner';
import { smartFormatNumber } from '../../helpers/numbers';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  secondary?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
  onClickAsync?: () => Promise<void>;
  cost?: number | null;
}

export const Button: React.FC<ButtonProps> = ({
  secondary = false,
  isLoading = false,
  children,
  disabled,
  className,
  onClickAsync,
  cost = null,
  ...props
}) => {
  return (
    <button
      className={`btn ${secondary ? 'btn-secondary' : ''}  ${className || ''}`}
      disabled={disabled || isLoading}
      onClick={() => {
        if (onClickAsync) {
          void onClickAsync();
        }
      }}
      {...props}
    >
      {isLoading ? <Spinner size={16} /> : children}
      {cost !== null && <span className="btn-cost"> (Cost: {smartFormatNumber(cost)})</span>}
    </button>
  );
};
