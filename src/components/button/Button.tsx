import React from 'react';
import './Button.css';
import { Spinner } from '../spinner/Spinner';
import { smartFormatNumber } from '../../helpers/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  secondary?: boolean;
  color?: 'primary' | 'blue' | 'red' | 'purple';
  isLoading?: boolean;
  children: React.ReactNode;
  onClickAsync?: () => Promise<void>;
  cost?: number | null;
  costType?: 'money' | 'gems';
}

export const Button: React.FC<ButtonProps> = ({
  secondary = false,
  color = 'primary',
  isLoading = false,
  children,
  disabled,
  className,
  onClickAsync,
  cost = null,
  costType = 'money',
  ...props
}) => {
  return (
    <button
      className={`btn ${secondary ? 'btn-secondary' : ''} ${color} ${className || ''}`}
      disabled={disabled || isLoading}
      onClick={() => {
        if (onClickAsync) {
          void onClickAsync();
        }
      }}
      {...props}
    >
      {isLoading ? <Spinner size={16} /> : children}
      {cost !== null && (
        <span className="btn-cost">
          (
          {costType === 'money' ? (
            <>Cost: {smartFormatNumber(cost)}</>
          ) : (
            <>
              Cost: {smartFormatNumber(cost, false)} Gems
            </>
          )}
          )
        </span>
      )}
    </button>
  );
};
