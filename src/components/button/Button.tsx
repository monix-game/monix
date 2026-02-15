import React from 'react';
import './Button.css';
import { Spinner } from '../spinner/Spinner';
import { smartFormatNumber } from '../../../server/common/math';

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
      className={`btn ${secondary ? 'btn-secondary' : ''} ${color} ${isLoading ? 'loading' : ''} ${className || ''}`}
      disabled={disabled || isLoading}
      onClick={() => {
        if (onClickAsync) {
          void onClickAsync();
        }
      }}
      {...props}
    >
      <span className="btn-content">
        {children}
        {cost !== null && (
          <span className="btn-cost">
            (
            {costType === 'money' ? (
              <>Cost: {smartFormatNumber(cost)}</>
            ) : (
              <>Cost: {smartFormatNumber(cost, false)} Gems</>
            )}
            )
          </span>
        )}
      </span>

      {isLoading && (
        <span className="btn-loading-spinner">
          <Spinner size={16} />
        </span>
      )}
    </button>
  );
};
