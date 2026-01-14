import React from 'react';
import './Checkbox.css';

interface CheckboxProps {
  checked?: boolean;
  label?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  label,
  disabled,
  className,
  onClick,
  ...props
}) => {
  return (
    <div className={`checkbox ${className || ''}`} {...props}>
      <div
        className={`checkbox-inner ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => {
          if (disabled) return;
          if (onClick) onClick();
        }}
      />
      {label && <span className="checkbox-label">{label}</span>}
    </div>
  );
};
