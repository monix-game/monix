import React from 'react';
import './Checkbox.css';

interface CheckboxProps {
  checked?: boolean;
  label?: string;
  color?: 'primary' | 'blue' | 'red' | 'purple';
  disabled?: boolean;
  className?: string;
  onClick?: (value: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  label,
  color = 'primary',
  disabled,
  className,
  onClick,
  ...props
}) => {
  return (
    <div className={`checkbox ${className || ''}`} {...props}>
      <div
        className={`checkbox-inner ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} ${color}`}
        onClick={() => {
          if (disabled) return;
          if (onClick) onClick(!checked);
        }}
      />
      {label && <span className="checkbox-label">{label}</span>}
    </div>
  );
};
