import React from 'react';
import './Button.css';
import { Spinner } from '../spinner/Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  secondary?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
  onClickAsync?: () => Promise<void>;
}

export const Button: React.FC<ButtonProps> = ({
  secondary = false,
  isLoading = false,
  children,
  disabled,
  className,
  onClickAsync,
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
    </button>
  );
};
