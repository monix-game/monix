import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  secondary?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  secondary = false,
  isLoading = false,
  children,
  disabled,
  className,
  ...props
}) => {
  return (
    <button
      className={`btn ${secondary ? 'btn-secondary' : ''}  ${className || ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className="spinner"></span> : children}
    </button>
  );
};
