import React from 'react';
import './Spinner.css';

interface SpinnerProps {
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 14, style, className }) => {
  return (
    <span
      className={`spinner ${className || ''}`}
      style={{ width: size, height: size, ...style }}
    ></span>
  );
};
