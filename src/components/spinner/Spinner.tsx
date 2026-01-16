import React from 'react';
import './Spinner.css';

interface SpinnerProps {
  size?: number;
  style?: React.CSSProperties;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 14, style }) => {
  return <span className="spinner" style={{ width: size, height: size, ...style }}></span>;
};
